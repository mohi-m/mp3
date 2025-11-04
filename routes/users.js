module.exports = function (router) {

    const usersRoute = router.route('/users');
    const usersIdRoute = router.route('/users/:id');

    // Load the User model
    const User = require('../models/user');

    // GET to /users
    usersRoute.get(function (req, res) {
        User.find({}, function (err, users) {
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
                data: users
            });
        });
    });

    // POST to /users
    usersRoute.post(function (req, res) {
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
                        error: 'The database server could not load the document',
                        errorMesage: err
                    }
                });
            }
            res.status(200).json({
                message: 'OK',
                data: savedUser
            });
        });
    });

    // GET to /users/:id
    usersIdRoute.get(function (req, res) {
        User.findById(req.params.id, function (err, user) {
            if (err) {
                return res.status(500).json({
                    message: 'SERVER ERROR',
                    data: {
                        error: 'The databse server could not retrieve the record',
                        errorMessage: err
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
        User.findByIdAndUpdate(
            req.params.id,
            {
                name: req.body.name,
                email: req.body.email,
                pendingTasks: req.body.pendingTasks || []
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
                            error: 'The User to be updated could not be found in the database'
                        }
                    });
                }
                res.json({
                    message: 'UPDATED',
                    data: updatedUser
                });
            }
        );
    });

    // DELETE to /users/:id
    usersIdRoute.delete(function (req, res) {
        User.findByIdAndRemove(req.params.id, function (err, deletedUser) {
            if (err) {
                return res.status(500).json({
                    message: 'SERVER ERROR',
                    data: {
                        error: 'The database server could not delete the record',
                        errorMessage: err
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
            res.json({
                message: 'DELETED',
                data: deletedUser
            });
        });
    });

    return router;

}