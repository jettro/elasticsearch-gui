controllerModule.controller('ChangeNumReplicasCtrl',['$scope', '$modalInstance', 'indexService',
function ($scope, $modalInstance, indexService) {
    $scope.dialog = {
        "numReplicas": indexService.numReplicas,
        "name": indexService.name
    };

    $scope.close = function (result) {
        $modalInstance.close(result);
    };

}]);