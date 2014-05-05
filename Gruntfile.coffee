module.exports = (grunt) ->
    JS_PATH = 'js/'
    JS_FILE = JS_PATH+'qiniu.js'

    grunt.initConfig
        jshint:
            options:
                jshintrc: '.jshintrc'
            all: [JS_FILE]

        uglify:
            compress:
                options:
                    report: 'min'
                files: [{
                    expand: true
                    src: [JS_FILE]
                }]
        copy:
            main:
                expand: true,
                flatten: true,
                src: 'src/qiniu.js',
                dest: 'demo/js/'

    grunt.loadNpmTasks 'grunt-contrib-watch'
    grunt.loadNpmTasks 'grunt-contrib-uglify'
    grunt.loadNpmTasks 'grunt-contrib-jshint'
    grunt.loadNpmTasks 'grunt-contrib-copy'

    grunt.event.on 'watch', (action, filepath) ->
        grunt.config ['jshint', 'all'], filepath

    grunt.registerTask 'production', [
        'jshint'
        'uglify:compress'
    ]

    grunt.registerTask 'default', [
        'jshint'
        'copy'
    ]
