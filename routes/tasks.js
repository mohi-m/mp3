module.exports = function (router) {

    const taskRoute = router.route('/tasks');
    const taskIdRoute = router.route('/tasks/:id');

    // Load the Tasks model
    const Task = require('../models/task')

    // GET to /tasks
    taskRoute.get(function (req, res) {
        Task.find({}, function (err, tasks) {
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
    });

    // POST to /tasks
    taskRoute.post(function (req, res) {
        if (!validateTask(req.body)) {
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
                        error: 'The database server could not load the document',
                        errorMesage: err
                    }
                });
            }
            res.status(200).json({
                message: 'OK',
                data: savedTask
            });
        });
    });

    // GET to /tasks/:id
    taskIdRoute.get(function (req, res) {
        Task.findById(req.params.id, function (err, task) {
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
        if (!validateTask(req.body)) {
            return res.status(400).json({
                message: 'BAD REQUEST',
                data: {
                    error: 'Task name and deadline are required in the request body'
                }
            });
        }
        Task.findByIdAndUpdate(
            req.params.id,
            {
                name: req.body.name,
                description: req.body.description || '',
                deadline: req.body.deadline,
                completed: req.body.completed || false,
                assignedUser: req.body.assignedUser || '',
                assignedUserName: req.body.assignedUserName || 'unassigned',
                dateCreated: new Date()
            },
            { new: true },
            function (err, updatedUser) {
                if (err) {
                    return res.status(500).json({
                        message: 'SERVER ERROR',
                        data: {
                            error: 'The databse server could not retrieve the record',
                            errorMessage: err
                        }
                    })
                }
                if (!updatedUser) {
                    return res.status(404).json({
                        message: 'NOT FOUND',
                        data: {
                            error: 'The Task to be updated could not be found in the database'
                        }
                    });
                }
                res.json({
                    message: 'UPDATED',
                    data: updatedUser
                });
            }
        )
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
            res.json({
                message: 'DELETED',
                data: deletedTask
            });
        });
    });

    return router;

}

function validateTask(task) {
    if (task.name && task.deadline) return true
    else return false
}