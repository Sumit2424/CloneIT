const express = require('express');
const router = express.Router();
const Project = require('../Database/models/Project');

// Get all history records for a user
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    const projects = await Project.find({ userID: userId })
      .sort({ timeStamp: -1 }) // Sort by newest first
      .lean();
    
    res.json(projects);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ message: 'Server error fetching history data' });
  }
});

// Get a specific project by ID
router.get('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId).lean();
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    res.json(project);
  } catch (error) {
    console.error('Error fetching project details:', error);
    res.status(500).json({ message: 'Server error fetching project details' });
  }
});

module.exports = router; 