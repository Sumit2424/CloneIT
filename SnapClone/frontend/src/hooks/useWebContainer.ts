import { useEffect, useState } from "react";
import { WebContainer } from '@webcontainer/api';

// Keep track of active WebContainer instance globally
let activeWebContainer: WebContainer | null = null;

export function useWebContainer() {
    const [webcontainer, setWebcontainer] = useState<WebContainer>();
    const [error, setError] = useState<string>();

    async function main() {
        try {
            // If there's an active instance, clean it up first
            if (activeWebContainer) {
                console.log("Cleaning up existing WebContainer instance...");
                try {
                    await activeWebContainer.teardown();
                    activeWebContainer = null;
                } catch (err) {
                    console.warn("Error cleaning up existing WebContainer:", err);
                }
            }

            console.log("Booting WebContainer...");
            const webcontainerInstance = await WebContainer.boot();
            console.log("WebContainer booted successfully!");
            activeWebContainer = webcontainerInstance;
            setWebcontainer(webcontainerInstance);
        } catch (err) {
            console.error("Failed to boot WebContainer:", err);
            setError(err instanceof Error ? err.message : String(err));
        }
    }

    useEffect(() => {
        main();

        // Cleanup function
        return () => {
            if (webcontainer) {
                console.log("Cleaning up WebContainer...");
                try {
                    webcontainer.teardown();
                    activeWebContainer = null;
                } catch (err) {
                    console.error("Error during WebContainer cleanup:", err);
                }
            }
        };
    }, []);

    return { webcontainer, error };
}