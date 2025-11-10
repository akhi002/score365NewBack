const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema({
    module: { type: String, required: true },
    actions: {
        create: { type: Boolean, default: false },
        read: { type: Boolean, default: false },
        update: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
    },
});

const roleSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    permissions: [permissionSchema],
}, { timestamps: true });

module.exports = mongoose.model("Role", roleSchema);
