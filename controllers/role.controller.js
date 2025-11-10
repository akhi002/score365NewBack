const Role = require("../models/role.model");

const createRole = async (req, res) => {
    try {
        const { name, permissions } = req.body;

        if (!name || !Array.isArray(permissions) || permissions.length == 0) {
            return res.status(400).json({
                success: false,
                message: "Role name and permissions are required",
            });
        }

        const existingRole = await Role.findOne({ name });
        if (existingRole) {
            return res.status(400).json({
                success: false,
                message: "Role with this name already exists",
            });
        }

        const newRole = new Role({ name, permissions });
        await newRole.save();

        res.status(201).json({
            success: true,
            message: "Role created successfully",
            data: newRole,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error while creating role",
        });
    }
};


module.exports = { createRole };
