function SnapshotsCtrl($scope, elastic) {
    $scope.repositories = [];
    $scope.selectedRepository = "";
    $scope.snapshots = [];
    $scope.snapshotsStatus = false;

    $scope.$watch('selectedRepository', function () {
        if ($scope.selectedRepository !== "") {
            elastic.obtainSnapshotStatus(function(snapshots) {
                if (snapshots.length > 0) {
                    $scope.snapshotsStatus = true;
                    $scope.snapshots = snapshots;

                } else {
                    elastic.obtainSnapshots($scope.selectedRepository, function(snapshots) {
                        $scope.snapshotsStatus = false;
                        $scope.snapshots = snapshots;
                    });
                }
            });
        }
    });

    $scope.listRepositories = function() {
        elastic.snapshotRepositories(function(data) {
            $scope.repositories = data;
        });
    };

    $scope.selectRepository = function(name) {
        $scope.selectedRepository = name;
    };

    $scope.$on('$viewContentLoaded', function () {
        $scope.listRepositories();
    });
}
SnapshotsCtrl.$inject = ['$scope', 'elastic'];
