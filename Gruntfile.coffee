module.exports = (grunt) ->
    JS_PATH = 'src/'
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
                files:
                    'src/qiniu.min.js' : [JS_FILE]
        copy:
            main:
                expand: true
                flatten: true
                src: 'src/qiniu.js'
                dest: 'demo/js/'
        watch:
            options:
               livereload: true
               debounceDelay: 600
            js:
               files: JS_FILE
               tasks: 'jshint'
               options:
                   spawn:false
            copy:
               files: [JS_FILE]
               tasks: 'copy'
            uglify:
                options:
                    report: 'min'
                files: [JS_FILE]
                tasks: 'uglify'

    grunt.loadNpmTasks 'grunt-contrib-watch'
    grunt.loadNpmTasks 'grunt-contrib-uglify'
    grunt.loadNpmTasks 'grunt-contrib-jshint'
    grunt.loadNpmTasks 'grunt-contrib-copy'

    grunt.event.on 'watch', (action, filepath) ->
        grunt.config ['jshint', 'all'], filepath

    grunt.registerTask 'production', [
        'jshint'
        'copy'
        'uglify:compress'
    ]

    grunt.registerTask 'default', [
        'jshint'
        'copy'
        'uglify:compress'
    ]
