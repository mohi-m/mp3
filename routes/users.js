module.exports = function (router) {

    const usersRoute = router.route('/users');
    const usersIdRoute = router.route('/users/:id');

    // Load the User model
    const User = require('../models/user');
    const Task = require('../models/task');

    // GET to /users
    usersRoute.get(function (req, res) {
        // Parse query parameters
        const where = req.query.where ? JSON.parse(req.query.where) : {};
        const sort = req.query.sort ? JSON.parse(req.query.sort) : {};
        const select = req.query.select ? JSON.parse(req.query.select) : {};
        const skip = req.query.skip ? parseInt(req.query.skip) : 0;
        const limit = req.query.limit ? parseInt(req.query.limit) : 0;
        const count = req.query.count === 'true';

        // Build query
        let query = User.find(where).sort(sort).select(select).skip(skip);

        if (limit > 0) {
            query = query.limit(limit);
        }

        if (count) {
            User.countDocuments(where, function (err, count) {
                if (err) {
                    return res.status(500).json({
                        message: 'SERVER ERROR',
                        data: {
                            error: 'The database server could not count the documents'
                        }
                    });
                }
                res.json({
                    message: 'OK',
                    data: count
                });
            });
        } else {
            query.exec(function (err, users) {
                if (err) {
                    return res.status(500).json({
                        message: 'SERVER ERROR',
                        data: {
                            error: 'The database server could not load the document'
                        }
                    });
                }
                res.json({
                    message: 'OK',
                    data: users
                });
            });
        }
    });

    // POST to /users
    usersRoute.post(function (req, res) {
        // Validation: name and email are required
        if (!req.body.name || !req.body.email) {
            return res.status(400).json({
                message: 'BAD REQUEST',
                data: {
                    error: 'User name and email are required'
                }
            });
        }

        // Check for duplicate email
        User.findOne({ email: req.body.email }, function (err, existingUser) {
            if (err) {
                return res.status(500).json({
                    message: 'SERVER ERROR',
                    data: {
                        error: 'The database server could not check for duplicate email'
                    }
                });
            }
            if (existingUser) {
                return res.status(400).json({
                    message: 'BAD REQUEST',
                    data: {
                        error: 'A user with this email already exists'
                    }
                });
            }

            var user = new User();
            user.name = req.body.name;
            user.email = req.body.email;
            user.pendingTasks = req.body.pendingTasks || [];
            user.dateCreated = new Date();

            user.save(function (err, savedUser) {
                if (err) {
                    return res.status(500).json({
                        message: 'SERVER ERROR',
                        data: {
                            error: 'The database server could not save the document'
                        }
                    });
                }
                res.status(201).json({
                    message: 'User created successfully',
                    data: savedUser
                });
            });
        });
    });

    // GET to /users/:id
    usersIdRoute.get(function (req, res) {
        const select = req.query.select ? JSON.parse(req.query.select) : {};

        User.findById(req.params.id).select(select).exec(function (err, user) {
            if (err) {
                return res.status(500).json({
                    message: 'SERVER ERROR',
                    data: {
                        error: 'The database server could not retrieve the record'
                    }
                })
            }
            if (!user) {
                return res.status(404).json({
                    message: 'NOT FOUND',
                    data: {
                        error: 'The request User could not be found in the database'
                    }
                })
            }
            res.json({
                message: 'OK',
                data: user
            })
        });
    });

    // PUT to /users/:id
    usersIdRoute.put(function (req, res) {
        // Validation: name and email are required
        if (!req.body.name || !req.body.email) {
            return res.status(400).json({
                message: 'BAD REQUEST',
                data: {
                    error: 'User name and email are required'
                }
            });
        }

        // Check for duplicate email (excluding current user)
        User.findOne({ email: req.body.email, _id: { $ne: req.params.id } }, function (err, existingUser) {
            if (err) {
                return res.status(500).json({
                    message: 'SERVER ERROR',
                    data: {
                        error: 'The database server could not check for duplicate email'
                    }
                });
            }
            if (existingUser) {
                return res.status(400).json({
                    message: 'BAD REQUEST',
                    data: {
                        error: 'A user with this email already exists'
                    }
                });
            }

            // Get old user to compare pendingTasks
            User.findById(req.params.id, function (err, oldUser) {
                if (err) {
                    return res.status(500).json({
                        message: 'SERVER ERROR',
                        data: {
                            error: 'The database server could not retrieve the record'
                        }
                    });
                }
                if (!oldUser) {
                    return res.status(404).json({
                        message: 'NOT FOUND',
                        data: {
                            error: 'The User to be updated could not be found in the database'
                        }
                    });
                }

                const newPendingTasks = req.body.pendingTasks || [];
                const oldPendingTasks = oldUser.pendingTasks || [];

                User.findByIdAndUpdate(
                    req.params.id,
                    {
                        name: req.body.name,
                        email: req.body.email,
                        pendingTasks: newPendingTasks
                    },
                    { new: true },
                    function (err, updatedUser) {
                        if (err) {
                            return res.status(500).json({
                                message: 'SERVER ERROR',
                                data: {
                                    error: 'The database server could not update the record'
                                }
                            });
                        }

                        // Handle two-way reference updates
                        // Update tasks that were added to pendingTasks
                        const addedTasks = newPendingTasks.filter(t => !oldPendingTasks.includes(t));
                        addedTasks.forEach(taskId => {
                            Task.findByIdAndUpdate(
                                taskId,
                                {
                                    assignedUser: req.params.id,
                                    assignedUserName: req.body.name
                                },
                                function (err) {
                                    if (err) console.error('Error updating task:', err);
                                }
                            );
                        });

                        // Update tasks that were removed from pendingTasks
                        const removedTasks = oldPendingTasks.filter(t => !newPendingTasks.includes(t));
                        removedTasks.forEach(taskId => {
                            Task.findByIdAndUpdate(
                                taskId,
                                {
                                    assignedUser: '',
                                    assignedUserName: 'unassigned'
                                },
                                function (err) {
                                    if (err) console.error('Error updating task:', err);
                                }
                            );
                        });

                        res.json({
                            message: 'User updated successfully',
                            data: updatedUser
                        });
                    }
                );
            });
        });
    });

    // DELETE to /users/:id
    usersIdRoute.delete(function (req, res) {
        User.findByIdAndRemove(req.params.id, function (err, deletedUser) {
            if (err) {
                return res.status(500).json({
                    message: 'SERVER ERROR',
                    data: {
                        error: 'The database server could not delete the record'
                    }
                });
            }
            if (!deletedUser) {
                return res.status(404).json({
                    message: 'NOT FOUND',
                    data: {
                        error: 'The User to be deleted could not be found in the database'
                    }
                });
            }

            // Unassign all tasks that were assigned to this user
            Task.updateMany(
                { assignedUser: req.params.id },
                {
                    assignedUser: '',
                    assignedUserName: 'unassigned'
                },
                function (err) {
                    if (err) console.error('Error unassigning tasks:', err);
                }
            );

            res.status(200).json({
                message: 'User deleted successfully',
                data: deletedUser
            });
        });
    });

    return router;

}