controllerModule.controller('InspectCtrl',['$scope', '$routeParams', '$location', 'elastic',
function ($scope, $routeParams, $location, elastic) {
    $scope.inspect = {};
    $scope.inspect.index = '';
    $scope.inspect.id = '';

    $scope.sourcedata = {};
    $scope.sourcedata.indices = [];

    if ($routeParams.id) {
        $scope.inspect.id = $routeParams.id;
    }

    $scope.doInspect = function () {
        $location.path("/inspect/" + $scope.inspect.index.name + "/" + $scope.inspect.id);
    };

    $scope.loadIndices = function () {
        elastic.indexes(function (data) {
            if (data) {
                for (var i = 0; i < data.length; i++) {
                    $scope.sourcedata.indices[i] = {"name": data[i]};
                    if ($routeParams.index && $routeParams.index == data[i]) {
                        $scope.inspect.index = $scope.sourcedata.indices[i];
                    }
                }
            } else {
                $scope.sourcedata.indices = [];
            }
        });
    };

    $scope.loadIndices();
}]);
