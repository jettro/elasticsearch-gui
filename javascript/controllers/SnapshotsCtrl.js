function SnapshotsCtrl($scope, elastic, $modal) {
    $scope.repositories = [];
    $scope.selectedRepository = "";
    $scope.snapshots = [];
    $scope.snapshotsStatus = false;

    $scope.$watch('selectedRepository', function () {
        $scope.listSnapshots();
    });

    $scope.listRepositories = function() {
        elastic.snapshotRepositories(function(data) {
            $scope.repositories = data;
        });
    };

    $scope.selectRepository = function(name) {
        $scope.selectedRepository = name;
    };

    $scope.deleteRepository = function(name) {
        elastic.deleteRepository(name, function(data) {
            if ($scope.selectedRepository === name) {
                $scope.selectedRepository = "";
            }
            $scope.listRepositories();
        });
    };

    $scope.listSnapshots = function() {
        if ($scope.selectedRepository !== "") {
            elastic.obtainSnapshotStatus(function (snapshots) {
                if (snapshots.length > 0) {
                    $scope.snapshotsStatus = true;
                    $scope.snapshots = snapshots;

                } else {
                    elastic.obtainSnapshots($scope.selectedRepository, function (snapshots) {
                        $scope.snapshotsStatus = false;
                        $scope.snapshots = snapshots;
                    });
                }
            });
        }
    };

    $scope.removeSnapshot = function(snapshot) {
        elastic.removeSnapshot($scope.selectedRepository, snapshot, function() {
            $scope.listSnapshots();
        });
    };

    $scope.removeSnapshotFromRepository = function(repository,snapshot) {
        elastic.removeSnapshot(repository, snapshot, function() {
            $scope.listSnapshots();
        });
    };

    $scope.restoreSnapshot = function(snapshot) {
        elastic.restoreSnapshot($scope.selectedRepository, snapshot, function() {
            $scope.listSnapshots();
        });
    };

    $scope.openCreateSnapshot = function () {
        var opts = {
            backdrop: true,
            keyboard: true,
            backdropClick: true,
            templateUrl: 'template/dialog/createsnapshot.html',
            controller: 'CreateSnapshotCtrl'
        };
        var modalInstance = $modal.open(opts);
        modalInstance.result.then(function (result) {
            if (result) {
                var newSnapshot = {};
                newSnapshot.repository = $scope.selectedRepository;
                if (result.name) {
                    newSnapshot.snapshot = result.name;
                } else {
                    var now = moment().format("YYYYMMDDHHmmss");
                    newSnapshot.snapshot = result.prefix + "-" + now;
                }
                newSnapshot.indices = result.indices;
                newSnapshot.ignoreUnavailable = result.ignoreUnavailable;
                newSnapshot.includeGlobalState = result.includeGlobalState;
                elastic.createSnapshot(newSnapshot, function() {
                    $scope.listSnapshots();
                });
            }
        }, function () {
            // Nothing to do here
        });
    };

    $scope.openCreateSnapshotRepository = function () {
        var opts = {
            backdrop: true,
            keyboard: true,
            backdropClick: true,
            templateUrl: 'template/dialog/createsnapshotrepository.html',
            controller: 'CreateSnapshotRepositoryCtrl'
        };
        var modalInstance = $modal.open(opts);
        modalInstance.result.then(function (result) {
            if (result) {
                elastic.createRepository(result, function() {
                    $scope.listRepositories();
                    $scope.selectedRepository = "";
                });
            }
        }, function () {
            // Nothing to do here
        });
    };

    $scope.$on('$viewContentLoaded', function () {
        $scope.listRepositories();
    });
}
SnapshotsCtrl.$inject = ['$scope', 'elastic', '$modal'];
