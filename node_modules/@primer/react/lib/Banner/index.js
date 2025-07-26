'use strict';

var Banner$1 = require('./Banner.js');

const Banner = Object.assign(Banner$1.Banner, {
  Title: Banner$1.BannerTitle,
  Description: Banner$1.BannerDescription,
  PrimaryAction: Banner$1.BannerPrimaryAction,
  SecondaryAction: Banner$1.BannerSecondaryAction
});

exports.Banner = Banner;
