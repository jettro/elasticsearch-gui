'use strict';

module.exports = function (grunt) {
    grunt.initConfig({
        pkg:grunt.file.readJSON('package.json'),
        banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
        '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
        '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
        '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
        ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */\n',
        watch: {
            js: {
                files: '<%= jshint.all %>',
                tasks: ['concat']
            },
            sass: {
                files: ['sass/*.scss'],
                tasks: ['sass']
            }
        },
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
                    'bower_components/moment/moment.js',
                    'bower_components/c3-angular/c3js-directive.js',
                    'javascript/app.js',
                    'javascript/controllers/*',
                    'javascript/directives.js',
                    'javascript/filters.js',
                    'javascript/services/*'
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
                'javascript/controllers/*',
                'javascript/services/*',
                'javascript/*.js'
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
        },
        sass: {
            dist: {
                options: {
                    sourcemap: true,
                    style: 'compressed'
                },
                files: {
                    'assets/css/app.min.css': 'sass/style.scss'
                }
            }
        },
        rsync: {
            options: {
                src: "./",
                args: ["--verbose"],
                exclude: ['.git*',
                    '.idea',
                    '.sass-cache',
                    'bower_components',
                    'javascript',
                    'node_modules',
                    'sass',
                    '.jshintrc',
                    'bower.json',
                    '*.iml',
                    'Gruntfile.js',
                    'package.json',
                    '.DS_Store',
                    'README.md'
                ],
                recursive: true,
                syncDestIgnoreExcl: true
            },
            staging: {
                options: {
                    dest: "/Users/jettrocoenradie/temp/gridshoregui"
                }
            }
        }

    });

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-rsync');

    grunt.registerTask('combine',['concat:dist','uglify:dist']);
};