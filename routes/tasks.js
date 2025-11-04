module.exports = function (router) {

    const taskRoute = router.route('/tasks');
    const taskIdRoute = router.route('/tasks/:id');

    // Load the models
    const Task = require('../models/task');
    const User = require('../models/user');

    // GET to /tasks
    taskRoute.get(function (req, res) {
        // Parse query parameters
        const where = req.query.where ? JSON.parse(req.query.where) : {};
        const sort = req.query.sort ? JSON.parse(req.query.sort) : {};
        const select = req.query.select ? JSON.parse(req.query.select) : {};
        const skip = req.query.skip ? parseInt(req.query.skip) : 0;
        const limit = req.query.limit ? parseInt(req.query.limit) : 100;
        const count = req.query.count === 'true';

        // Build query
        let query = Task.find(where).sort(sort).select(select).skip(skip).limit(limit);

        if (count) {
            Task.countDocuments(where, function (err, count) {
                if (err) {
                    return res.status(500).json({
                        message: 'SERVER ERROR',
                        data: {
                            error: 'The database server could not count the documents',
                            errorMessage: err
                        }
                    });
                }
                res.json({
                    message: 'OK',
                    data: count
                });
            });
        } else {
            query.exec(function (err, tasks) {
                if (err) {
                    return res.status(500).json({
                        message: 'SERVER ERROR',
                        data: {
                            error: 'The database server could not load the document',
                            errorMesage: err
                        }
                    });
                }
                res.json({
                    message: 'OK',
                    data: tasks
                });
            });
        }
    });

    // POST to /tasks
    taskRoute.post(function (req, res) {
        if (!req.body.name || !req.body.deadline) {
            return res.status(400).json({
                message: 'BAD REQUEST',
                data: {
                    error: 'Task name and deadline are required in the request body'
                }
            });
        }
        var task = new Task();
        task.name = req.body.name;
        task.description = req.body.description || '';
        task.deadline = req.body.deadline;
        task.completed = req.body.completed || false;
        task.assignedUser = req.body.assignedUser || '';
        task.assignedUserName = req.body.assignedUserName || 'unassigned';
        task.dateCreated = new Date();

        task.save(function (err, savedTask) {
            if (err) {
                return res.status(500).json({
                    message: 'SERVER ERROR',
                    data: {
                        error: 'The database server could not save the document',
                        errorMessage: err
                    }
                });
            }

            // If task is assigned to a user, add it to user's pendingTasks
            if (savedTask.assignedUser) {
                User.findByIdAndUpdate(
                    savedTask.assignedUser,
                    { $addToSet: { pendingTasks: savedTask._id } },
                    function (err) {
                        if (err) console.error('Error adding task to user:', err);
                    }
                );
            }

            res.status(201).json({
                message: 'Task created successfully',
                data: savedTask
            });
        });
    });

    // GET to /tasks/:id
    taskIdRoute.get(function (req, res) {
        const select = req.query.select ? JSON.parse(req.query.select) : {};

        Task.findById(req.params.id).select(select).exec(function (err, task) {
            if (err) {
                return res.status(500).json({
                    message: 'SERVER ERROR',
                    data: {
                        error: 'The databse server could not retrieve the record',
                        errorMessage: err
                    }
                })
            }
            if (!task) {
                return res.status(404).json({
                    message: 'NOT FOUND',
                    data: {
                        error: 'The request Task could not be found in the database'
                    }
                })
            }
            res.json({
                message: 'OK',
                data: task
            })
        });
    });

    // PUT to /tasks/:id
    taskIdRoute.put(function (req, res) {
        if (!req.body.name || !req.body.deadline) {
            return res.status(400).json({
                message: 'BAD REQUEST',
                data: {
                    error: 'Task name and deadline are required in the request body'
                }
            });
        }

        // First, get the old task to handle user assignment changes
        Task.findById(req.params.id, function (err, oldTask) {
            if (err) {
                return res.status(500).json({
                    message: 'SERVER ERROR',
                    data: {
                        error: 'The database server could not retrieve the record',
                        errorMessage: err
                    }
                });
            }
            if (!oldTask) {
                return res.status(404).json({
                    message: 'NOT FOUND',
                    data: {
                        error: 'The Task to be updated could not be found in the database'
                    }
                });
            }

            const newAssignedUser = req.body.assignedUser || '';
            const oldAssignedUser = oldTask.assignedUser;

            Task.findByIdAndUpdate(
                req.params.id,
                {
                    name: req.body.name,
                    description: req.body.description || '',
                    deadline: req.body.deadline,
                    completed: req.body.completed || false,
                    assignedUser: newAssignedUser,
                    assignedUserName: req.body.assignedUserName || 'unassigned'
                },
                { new: true },
                function (err, updatedTask) {
                    if (err) {
                        return res.status(500).json({
                            message: 'SERVER ERROR',
                            data: {
                                error: 'The database server could not update the record',
                                errorMessage: err
                            }
                        });
                    }

                    // Handle two-way reference updates
                    // Remove task from old user's pendingTasks
                    if (oldAssignedUser && oldAssignedUser !== newAssignedUser) {
                        User.findByIdAndUpdate(
                            oldAssignedUser,
                            { $pull: { pendingTasks: req.params.id } },
                            function (err) {
                                if (err) console.error('Error removing task from old user:', err);
                            }
                        );
                    }

                    // Add task to new user's pendingTasks
                    if (newAssignedUser && newAssignedUser !== oldAssignedUser) {
                        User.findByIdAndUpdate(
                            newAssignedUser,
                            { $addToSet: { pendingTasks: req.params.id } },
                            function (err) {
                                if (err) console.error('Error adding task to new user:', err);
                            }
                        );
                    }

                    res.json({
                        message: 'Task updated successfully',
                        data: updatedTask
                    });
                }
            );
        });
    });

    // DELETE to /tasks/:id
    taskIdRoute.delete(function (req, res) {
        Task.findByIdAndRemove(req.params.id, function (err, deletedTask) {
            if (err) {
                return res.status(500).json({
                    message: 'SERVER ERROR',
                    data: {
                        error: 'The database server could not delete the record',
                        errorMessage: err
                    }
                });
            }
            if (!deletedTask) {
                return res.status(404).json({
                    message: 'NOT FOUND',
                    data: {
                        error: 'The Task to be deleted could not be found in the database'
                    }
                });
            }

            // Remove task from assigned user's pendingTasks
            if (deletedTask.assignedUser) {
                User.findByIdAndUpdate(
                    deletedTask.assignedUser,
                    { $pull: { pendingTasks: req.params.id } },
                    function (err) {
                        if (err) console.error('Error removing task from user:', err);
                    }
                );
            }

            res.status(200).json({
                message: 'Task deleted successfully',
                data: deletedTask
            });
        });
    });

    return router;

}