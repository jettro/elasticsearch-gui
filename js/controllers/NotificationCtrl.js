function NotificationCtrl($scope, $timeout){
    $scope.alerts = {};

    $scope.$on('msg:notification', function (event, type, message) {
        var id = Math.random().toString(36).substring(2, 5);
        $scope.alerts[id] = {"type": type, "message": message};

        $timeout(function () {
            delete $scope.alerts[id];
        }, 10000);
    });
}
NotificationCtrl.$inject = ['$scope', '$timeout'];