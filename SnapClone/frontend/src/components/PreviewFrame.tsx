import { WebContainer } from '@webcontainer/api';
import React, { useEffect, useState, useRef } from 'react';

interface PreviewFrameProps {
  files: any[];
  webContainer: WebContainer;
}

export function PreviewFrame({ files, webContainer }: PreviewFrameProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<'idle' | 'installing' | 'starting' | 'ready'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const lastWorkingUrl = useRef<string>("");
  const retryCount = useRef(0);
  const maxRetries = 3;

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toISOString()}] ${message}`]);
    console.log(message);
  };

  // Clean TailwindCSS classes
  const cleanTailwindClasses = (content: string) => {
    try {
      // Remove any invalid characters or unsupported syntax
      return content.replace(/[^\w\s-:\/\[\]]/g, '');
    } catch (err) {
      addLog(`Warning: Failed to clean TailwindCSS classes: ${err}`);
      return content;
    }
  };

  // Validate package.json
  const validatePackageJson = async () => {
    try {
      const packageJsonFile = files.find(f => f.name === 'package.json');
      if (!packageJsonFile) {
        throw new Error('package.json not found');
      }

      const content = JSON.parse(packageJsonFile.content);
      const requiredDeps = ['tailwindcss', 'postcss', 'autoprefixer'];
      const missingDeps = requiredDeps.filter(dep => !content.dependencies?.[dep] && !content.devDependencies?.[dep]);

      if (missingDeps.length > 0) {
        addLog(`Adding missing dependencies: ${missingDeps.join(', ')}`);
        const installCmd = await webContainer.spawn('npm', ['install', '-D', ...missingDeps]);
        await installCmd.exit;
      }

      return true;
    } catch (err) {
      addLog(`Package.json validation failed: ${err}`);
      return false;
    }
  };

  const handlePreviewError = (err: any) => {
    const errorMessage = err instanceof Error ? err.message : String(err);
    addLog(`Error: ${errorMessage}`);
    setError(errorMessage);

    // If we have a last working URL, use it as fallback
    if (lastWorkingUrl.current) {
      addLog('Falling back to last working preview');
      setUrl(lastWorkingUrl.current);
      return true;
    }

    // If we haven't exceeded retry count, attempt retry
    if (retryCount.current < maxRetries) {
      retryCount.current++;
      addLog(`Retrying preview generation (attempt ${retryCount.current}/${maxRetries})`);
      setTimeout(main, 2000); // Retry after 2 seconds
      return true;
    }

    setStatus('idle');
    return false;
  };

  async function main() {
    if (!webContainer) {
      setError("WebContainer is not initialized");
      return;
    }

    try {
      setStatus('installing');
      addLog('Validating configuration...');

      // Validate package.json and install missing dependencies
      const isValid = await validatePackageJson();
      if (!isValid) {
        throw new Error('Failed to validate package.json');
      }

      addLog('Starting npm install...');
      const installProcess = await webContainer.spawn('npm', ['install']);

      // Capture installation output
      installProcess.output.pipeTo(new WritableStream({
        write(data) {
          // Clean TailwindCSS related output
          if (data.includes('tailwind')) {
            data = cleanTailwindClasses(data);
          }
          addLog(`Install output: ${data}`);
        }
      }));

      const installExitCode = await installProcess.exit;
      
      if (installExitCode !== 0) {
        throw new Error(`Installation failed with exit code ${installExitCode}`);
      }
      
      addLog('Installation completed successfully');
      setStatus('starting');
      
      // Start the dev server
      addLog('Starting dev server...');
      const devProcess = await webContainer.spawn('npm', ['run', 'dev']);
      
      // Capture server output
      devProcess.output.pipeTo(new WritableStream({
        write(data) {
          // Clean TailwindCSS related output
          if (data.includes('tailwind')) {
            data = cleanTailwindClasses(data);
          }
          addLog(`Server output: ${data}`);
        }
      }));

      // Listen for server ready event
      webContainer.on('server-ready', (port, url) => {
        addLog(`Server is ready on port ${port} at ${url}`);
        setStatus('ready');
        setUrl(url);
        lastWorkingUrl.current = url; // Store the working URL
        retryCount.current = 0; // Reset retry count on success
      });
    } catch (err) {
      if (!handlePreviewError(err)) {
        addLog('Preview failed and no previous version available');
      }
    }
  }

  useEffect(() => {
    main();
  }, [webContainer, files]);

  if (error && !lastWorkingUrl.current) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-red-400 p-4">
        <div className="text-center mb-4">
          <p className="mb-2">Preview generation failed</p>
          <p className="text-sm">No previous working preview available.</p>
        </div>
        <div className="w-full max-w-2xl bg-gray-800 p-4 rounded-lg overflow-auto">
          <h3 className="text-white mb-2">Debug Logs:</h3>
          {logs.map((log, index) => (
            <pre key={index} className="text-xs text-gray-400 whitespace-pre-wrap">{log}</pre>
          ))}
        </div>
      </div>
    );
  }

  if (!url && !lastWorkingUrl.current) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 p-4">
        <div className="text-center mb-4">
          <p className="mb-2">
            {status === 'installing' && 'Installing dependencies...'}
            {status === 'starting' && 'Starting development server...'}
            {status === 'idle' && 'Initializing preview...'}
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto"></div>
        </div>
        <div className="w-full max-w-2xl bg-gray-800 p-4 rounded-lg overflow-auto">
          <h3 className="text-white mb-2">Debug Logs:</h3>
          {logs.map((log, index) => (
            <pre key={index} className="text-xs text-gray-400 whitespace-pre-wrap">{log}</pre>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <iframe 
        width="100%" 
        height="100%" 
        src={url || lastWorkingUrl.current}
        className="border-0 rounded-lg"
      />
    </div>
  );
}