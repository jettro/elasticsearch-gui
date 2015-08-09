controllerModule.controller('ConfigDialogCtrl',['$scope', '$modalInstance', 'configuration',
function ($scope, $modalInstance, configuration){
    $scope.configuration = configuration;

    $scope.close = function (result) {
        $modalInstance.close($scope.configuration);
    };

}]);