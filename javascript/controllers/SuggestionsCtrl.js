function SuggestionsCtrl($scope, elastic) {
    $scope.suggest = {};
    $scope.suggest.index = '';
    $scope.suggest.field = '';
    $scope.suggest.query = '';
    $scope.suggest.min_word_length = 3;
    $scope.suggest.prefix_length = 1;

    $scope.sourcedata = {};
    $scope.sourcedata.indices = [];
    $scope.sourcedata.fields = [];

    $scope.results = {};

    $scope.unbind = {};
    $scope.unbind.indicesScope = function () {
    };

    $scope.suggest = function () {
        var request = {};
        request.index = $scope.suggest.index.name;
        request.field = $scope.suggest.field;
        request.query = $scope.suggest.query;
        request.min_word_length = $scope.suggest.min_word_length;
        request.prefix_length = $scope.suggest.prefix_length;

        elastic.suggest(request, function (result) {
            $scope.results = result;
        });
    };

    $scope.loadIndices = function () {
        $scope.unbind.indicesScope();
        elastic.indexes(function (data) {
            if (data) {
                for (var i = 0; i < data.length; i++) {
                    $scope.sourcedata.indices[i] = {"name": data[i]};
                }
                $scope.unbind.indicesScope = $scope.$watch('suggest.index', $scope.loadFields, true);
            } else {
                $scope.sourcedata.indices = [];
                $scope.sourcedata.fields = [];
            }
        });
    };

    $scope.loadFields = function () {
        var selectedIndices = [];
        if ($scope.suggest.index) {
            selectedIndices.push($scope.suggest.index.name);
        }

        var selectedTypes = [];

        elastic.fields(selectedIndices, selectedTypes, function (data) {
            $scope.sourcedata.fields = data;
        });
    };

    $scope.loadIndices();
}
SuggestionsCtrl.$inject = ['$scope', 'elastic'];
