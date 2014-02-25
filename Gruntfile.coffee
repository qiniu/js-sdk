module.exports = (grunt) - >
    # Constants
BIN_PATH = 'bin/'
ASSETS_PATH = 'src/qiniu.com/portal/public/'
LESS_PATH = ASSETS_PATH + 'css/global/less/'
JS_PATH = ASSETS_PATH + 'js/'
JS_SRC = JS_PATH + '**/*.js'
JS_MAIN = JS_PATH + 'global/global.min.js'
LESS_MAIN = LESS_PATH + 'main.less'
CSS_MAIN = 'src/qiniu.com/portal/public/css/global/main.css'
LESS_DOCS = LESS_PATH + 'docs.less'
LESS_SRC = LESS_PATH + '**/_*.less'
JS_ADD_ON = ASSETS_PATH + 'add-on/'
JS_COMBINE = 'src/qiniu.com/portal/public/js/global/global.min.js': [
    JS_ADD_ON + 'phpjs/date.js'
    JS_ADD_ON + 'phpjs/strtotime.js'
    JS_ADD_ON + 'rails.js'
    JS_PATH + 'global/_qiniu.js'
    JS_PATH + 'zendesk/init.js'
    JS_PATH + 'global/_jquery_extend.js'
    JS_PATH + 'global/_global.js'
    JS_PATH + 'global/_bucket-list.js'
]
CSS_MAIN_FILES = 'src/qiniu.com/portal/public/css/global/main.css': [LESS_MAIN]
CSS_DOCS_FILES = 'src/qiniu.com/portal/public/css/global/docs.css': [LESS_DOCS]

# Project configuration
grunt.initConfig
jshint: options: jshintrc: '../.jshintrc'
ignores: [JS_MAIN]
all: [JS_SRC]

csslint: options: csslintrc: '../.csslintrc'
strict: src: [CSS_MAIN]

less: development: options: dumpLineNumbers: 'comments'
files: [
    CSS_MAIN_FILES,
    CSS_DOCS_FILES
]
production: options: yuicompress: true
files: [
    CSS_MAIN_FILES,
    CSS_DOCS_FILES
]

concat: combine: options: separator: ';'
files: JS_COMBINE

uglify: combine: options: report: 'min'
files: JS_COMBINE
production: options: report: 'min'
files: [{
    expand: true
    src: ['src/qiniu.com/portal/public/**/*.js', 'src/qiniu.com/portal/!public/**/*.min.js']
}]

# run once in local
# imagemin: # local: # files: [{
    # expand: true
    # src: ['src/qiniu.com/portal/public/image/**/*.{png,jpg,gif}']
    #
}]

watch: options: livereload: true
debounceDelay: 600
less: files: LESS_SRC
tasks: 'less:development'
js: files: JS_SRC
tasks: 'jshint'
options: spawn: false
concat: files: [JS_PATH + 'global/_*.js']
tasks: 'concat'
csslint: files: CSS_MAIN
tasks: 'csslint:strict'

# TODO 1 restart go app
# tpl_config: # options: # interrupt: true
# files: TPL_SRC
# TODO 2 recompile go
# go: # files: GO_SRC
#

# Dependencies
grunt.loadNpmTasks 'grunt-contrib-coffee'
grunt.loadNpmTasks 'grunt-contrib-less'
grunt.loadNpmTasks 'grunt-contrib-clean'
grunt.loadNpmTasks 'grunt-contrib-watch'
grunt.loadNpmTasks 'grunt-contrib-jshint'
grunt.loadNpmTasks 'grunt-contrib-concat'
grunt.loadNpmTasks 'grunt-contrib-uglify'
grunt.loadNpmTasks 'grunt-contrib-csslint'
# grunt.loadNpmTasks 'grunt-contrib-imagemin'

# on watch events configure jshint: all to only run on changed file
grunt.event.on 'watch',
(action, filepath) - >
    grunt.config['jshint', 'all'],
filepath

grunt.registerTask 'production',
[
    'jshint'
    'less:production'
    'csslint:strict'
    'uglify:production'
    'uglify:combine'
]

grunt.registerTask 'default',
[
    'jshint'
    'less:development'
    'csslint:strict'
    'concat'
]
