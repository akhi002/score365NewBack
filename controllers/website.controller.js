const express = require('express');
const Website = require('../models/website.model');

const createWebsite = async (req, res) => {
    const { websiteName, domain } = req.body;
    const redis = req.app.locals.redis;

    if (!websiteName || !domain)
        return res.status(400).json({ error: 'websiteName & domain required' });

    try {
        // Save to MongoDB
        let website = await Website.findOne({ domain });
        if (website) {
            return res.status(400).json({ error: 'Domain already exists' });
        }

        website = new Website({ websiteName, domain });
        await website.save();

        // Clear cached website list
        await redis.del('all_websites');

        // Save in Redis
        // Save single website in Redis
        await redis.set(domain, JSON.stringify({ websiteName, domain }));

        res.json({ message: 'Saved in MongoDB & Redis', data: website });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }

};

const getAllWebsites = async (req, res) => {
    const redis = req.app.locals.redis;

    try {
        const cached = await redis.get('all_websites');
        if (cached) {
            return res.json({ source: 'Redis', data: JSON.parse(cached) });
        }

        const websites = await Website.find({}).sort({ createdAt: -1 });

        // Cache in Redis for 1 hour
        await redis.setEx('all_websites', 3600, JSON.stringify(websites));

        res.json({ source: 'MongoDB', data: websites });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};


const updateWebsiteDomain = async (req, res) => {
    const { id, domain } = req.body; // get both from body
    const redis = req.app.locals.redis;

    if (!id || !domain) {
        return res.status(400).json({ error: 'id and domain are required' });
    }

    try {
        const website = await Website.findById(id);
        if (!website) {
            return res.status(404).json({ error: 'Website not found' });
        }

        // Check if the new domain already exists
        const existing = await Website.findOne({ domain });
        if (existing && existing._id.toString() !== id) {
            return res.status(400).json({ error: 'Domain already exists' });
        }

        const oldDomain = website.domain;

        // Update domain
        website.domain = domain;
        await website.save();

        // Update Redis
        await redis.del(oldDomain); // delete old domain key
        await redis.set(domain, JSON.stringify({ websiteName: website.websiteName, domain })); // set new key
        await redis.del('all_websites'); // clear cached list

        res.json({ message: 'Domain updated successfully', data: website });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};


const deleteWebsite = async (req, res) => {
  const { id } = req.body; 
  const redis = req.app.locals.redis;

  if (!id) {
    return res.status(400).json({ error: 'id is required' });
  }

  try {
    const website = await Website.findById(id);
    if (!website) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const domain = website.domain;

    // Delete from MongoDB
    await Website.findByIdAndDelete(id);

    // Delete from Redis
    await redis.del(domain);           // delete individual domain cache
    await redis.del('all_websites');  // clear cached website list

    res.json({ message: 'Website deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};




module.exports = { createWebsite, getAllWebsites, updateWebsiteDomain,deleteWebsite };
