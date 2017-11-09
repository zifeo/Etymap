module.exports = function(grunt) {

  require("load-grunt-tasks")(grunt);

  grunt.initConfig({
    less: {
      dist: {
        files: {
          'build/app.css': 'less/app.less',
        },
      },
    },
    htmlmin: {
      dist: {
        options: {
          removeComments: true,
          collapseWhitespace: true,
          minifyURLs: true,
          minifyJS: true,
        },
        files: {
          'build/index.html': 'static/index.html',
        },
      },
    },
    copy: {
      dist: {
        files: [
          {
            expand: true,
            cwd: 'static',
            src: ['fonts/**/*', 'img/**/*'],
            dest: 'build',
          },
        ],
      },
    },
    watch: {
      options: {
        livereload: true,
        nospawn: true,
      },
      less: {
        files: 'less/**/*.less',
        tasks: 'less',
      },
      html: {
        files: 'static/index.html',
        tasks: 'htmlmin',
      },
      files: {
        files: ['static/fonts/**/*', 'static/img/**/*'],
        tasks: 'copy',
      },
      flask: {
        files: 'server/**/*.py',
      },
    },
    clean: ['build'],
    browserify: {
      dist: {
        options: {
          transform: ['babelify'],
          watch: true,
          browserifyOptions: {
            debug: true,
          },
          plugin: ['livereactload'],
        },
        files: {
          'build/app.js': 'src/app.js',
        },
      },
    },
    shell: {
      flask: {
        command: 'export FLASK_APP=server/app.py && export FLASK_DEBUG=1 && (flask run || python3 -m flask run)',
        options: {
          async: true,
          stdout: true,
          stderr: true,
          failOnError: true,
        },
      },
    },
  });

  grunt.registerTask('default', ['clean', 'less', 'htmlmin', 'copy']);
  grunt.registerTask('dev', ['default', 'browserify', 'shell', 'watch']);

};

