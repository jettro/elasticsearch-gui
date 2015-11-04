controllerModule.controller('InspectCtrl',['$scope', 'elastic',
function ($scope, elastic) {
    $scope.inspect = {};
    $scope.inspect.index = '';
    $scope.inspect.id = '';

    $scope.sourcedata = {};
    $scope.sourcedata.indices = [];
    $scope.sourcedata.fields = [];

    $scope.results = {};

    $scope.unbind = {};
    $scope.unbind.indicesScope = function () {
    };

    $scope.doInspect = function () {
        var request = {};
        request.index = $scope.inspect.index.name;
        request.query = $scope.inspect.id;
        
        alert("not yet implemented");
    };

    $scope.loadIndices = function () {
        $scope.unbind.indicesScope();
        elastic.indexes(function (data) {
            if (data) {
                for (var i = 0; i < data.length; i++) {
                    $scope.sourcedata.indices[i] = {"name": data[i]};
                }
                $scope.unbind.indicesScope = $scope.$watch('inspect.index', $scope.loadFields, true);
            } else {
                $scope.sourcedata.indices = [];
                $scope.sourcedata.fields = [];
            }
        });
    };

    $scope.loadIndices();
}]);
