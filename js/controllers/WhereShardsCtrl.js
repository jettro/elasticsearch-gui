function WhereShardsCtrl($scope, $timeout, elastic) {
    $scope.shardsInfo = {};
    $scope.nodeInfo = {};
    $scope.init = function () {
        obtainShardsInfo();
    };

    function obtainShardsInfo() {
        elastic.obtainShards(function (nodeInfo,data) {
            var nodes = {};
            angular.forEach(data, function (shards, node) {
                var indices = {};
                angular.forEach(shards, function (shard) {
                    if (!indices[shard.index]) {
                        indices[shard.index] = [];
                    }
                    var desc;
                    if (shard.primary) {
                        desc = " (P)";
                    } else {
                        desc = " (R)";
                    }
                    indices[shard.index].push(shard.shard + desc)
                });
                nodes[node] = indices;
            });
            $scope.nodeInfo = nodeInfo;
            $scope.shardsInfo = nodes;
        });
        $timeout(function() {
            obtainShardsInfo();
        }, 5000);
    }
}
WhereShardsCtrl.$inject = ['$scope', '$timeout', 'elastic'];
