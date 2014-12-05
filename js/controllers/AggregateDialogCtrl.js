function AggregateDialogCtrl ($scope, $modalInstance, fields) {
    $scope.fields = fields;
    $scope.aggsTypes = ["Term", "Range", "Histogram", "DateHistogram"];
    $scope.ranges = [];
    $scope.intervals = ["year", "month", "week", "day", "hour", "minute"];

    $scope.close = function (result) {
        var dialogResult = {};
        dialogResult.field = result.field;
        dialogResult.name = result.name;
        if (result.aggstype === 'Term') {
            dialogResult.aggsType = 'term';
        } else if (result.aggstype === 'Range') {
            dialogResult.aggsType = 'range';
            dialogResult.ranges = $scope.ranges;
        } else if (result.aggstype === 'DateHistogram') {
            dialogResult.aggsType = 'datehistogram';
            dialogResult.interval = result.interval;
        } else if (result.aggstype === 'Histogram') {
            dialogResult.aggsType = 'histogram';
            dialogResult.interval = result.interval;
        }
        $modalInstance.close(dialogResult);
    };

    $scope.addRangeField = function (data) {
        $scope.ranges.push([data.range.from, data.range.to]);
    }
}
AggregateDialogCtrl.$inject = ['$scope', '$modalInstance', 'fields'];