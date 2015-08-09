controllerModule.controller('NodeInfoCtrl',['$scope', 'elastic', '$routeParams',
function NodeInfoCtrl($scope, elastic, $routeParams) {
    var nodeId = $routeParams.nodeId;
    elastic.nodeInfo(nodeId, function (data) {
        $scope.nodes = data;
    });
}]);
