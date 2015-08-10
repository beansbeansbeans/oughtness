var gulp = require('gulp'),
  gutil = require('gulp-util'),
  runSequence = require('run-sequence'),
  config = require('../config');

var startedWatching = function() {
  gutil.log(gutil.colors.green('[ ...WATCHING ]'));
};

gulp.task('default', function() {
  gulp.start('always');
});

gulp.task('admin', function() {
  gulp.start('always');
});

gulp.task('always', function() {
  gutil.log(gutil.colors.green('[ ' + config.env + ' : STARTING TO WATCH... ]'));

  var sequence = ['clean', 'copy', 'sass', 'markup', 'watch', 'connect'];

  sequence.push(startedWatching);

  runSequence.apply(this, sequence);
});
