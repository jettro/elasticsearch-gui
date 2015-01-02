function ChangeNumReplicasCtrl ($scope, $modalInstance, indexService) {
    $scope.dialog = {
        "numReplicas": indexService.numReplicas,
        "name": indexService.name
    };

    $scope.close = function (result) {
        $modalInstance.close(result);
    };

}
ChangeNumReplicasCtrl.$inject = ['$scope', '$modalInstance', 'indexService'];
