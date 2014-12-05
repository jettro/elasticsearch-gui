'use strict';

module.exports = function (grunt) {
    grunt.initConfig({
        pkg:grunt.file.readJSON('package.json'),
        banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
        '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
        '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
        '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
        ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */\n',
        concat: {
            options: {
                banner: '<%= banner %>',
                stripBanners: true
            },
            dist: {
                src: [
                    'bower_components/angular/angular.js',
                    'bower_components/angular-route/angular-route.js',
                    'bower_components/ui-bootstrap/dist/ui-bootstrap-0.11.2.js',
                    'bower_components/elasticsearch/elasticsearch.angular.js',
                    'bower_components/d3/d3.js',
                    'bower_components/c3/c3.js',
                    'js/c3js-directive.js',
                    'js/app.js','js/controllers/*','js/directives.js','js/filters.js','js/services.js'
                    ],
                dest: 'assets/js/<%= pkg.name %>.js'
            }
        },
        jshint: {
            options: {
                jshintrc: '.jshintrc',
                "force": true
            },
            all: [
                'Gruntfile.js',
                'assets/js/elasticsearch-gui.js'
            ]
        },
        uglify: {
            options: {
                banner: '<%= banner %>',
                sourceMap: 'assets/js/<%= pkg.name %>.js.map',
                sourceMappingURL: 'assets/js/<%= pkg.name %>.js.map',
                sourceMapPrefix: 2
            },
            dist: {
                src: '<%= concat.dist.dest %>',
                dest: 'assets/js/<%= pkg.name %>.min.js'
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');

    grunt.registerTask('combine',['concat:dist','uglify:dist']);
};