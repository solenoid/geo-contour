# GEO Contour

Take the publicly available USGS contour data and turn that into svg files.

This also attempts to remove "blocky artifacts" from the data that look to be due to data in different blocks having different interval data available to them. You can see those artifacts in the jpg preview pictures and also if you just "show all contour lines" that are in the data.

## Getting Started

```bash
# one time npm install
npm install
# get data from USGS
npm run fetch:zip --shape=ma_western
# see pacakge.json config section for other --shape options
# if no --shape is passed ma_eastern is used by default

# clean up zip files after data has been expanded,
# failing on no zip files is expected and fine.
npm run remove:zips
# generate the svg in the out directory, same --shape options are available
npm start --shape=ma_western
```

Afer this you should have a kinda large svg file in your out directory and you can load it up in a browser like Chrome to see what it looks like. It loads much faster in Chrome if you open it in a new tab and then wait a few seconds for it to load (while not the visible tab) then switch to that tab. If you load it instead with the tab visible you get a cool 90s progressive loading by block view for 30ish seconds that also is probably directly related to the line order in the file. This progressive load gives a little insight into where some of the blocky artifacts can be coming from since that's how the data is in the source file.

### Adding Points of Interest

If you want to add orange see through dots at a points of interest you can do so by making a "dot env" file with those points. At the root of this folder make a `.env` file and here's an example starting point for that file.

```
# All coordinates are in [Longitude, Latitude] format to match the mathematical notion of [x, y].
# NOTE Google Maps is reverse [Latitude, Longitude] aka [y, x] in the URL. So grabbing coordinates from there just flip them.

# interests points are optional and there can be more than one by putting a colon : between them.
# Here we're showing 'Hammond Pond Bouldering: Purgatory Chasm Awesomeness'
ma_eastern_interests='-71.1752033, 42.322943 : -71.7179697, 42.127719     '

# Other Interests outside Eastern MA would mirror the shape name with the _interests suffix.
# Here we're showing 'The Flying Horses at Oaks Bluff'
ma_capecod_interests='-70.5574153,41.4572572'
```

### Adding More Supported Areas

If you want more shape support than the handful added initially just add a memorable name for the key in package.json config and the value should be one of the ones available on the USGS staged data site.

https://prd-tnm.s3.amazonaws.com/index.html?prefix=StagedProducts/Contours/Shape/

The naming scheme in the package.json file is all lower case `"<us state>_<memorable name>"` instead of the USGS naming scheme which still doesn't make enough sense to be memorable as to what's shown where.

The jpg files on the staged data site are useful to see roughly what you'll get and also to aid in debugging once the data is downloaded.

### Appendix

Very useful information found after the code was mostly written that describes what went into the data set and also what some of the data even means is https://pubs.usgs.gov/sir/2012/5167/sir2012-5167.pdf

Still TODO is to pull in more relevant information from the Data Dictionary and relate back to that document about what assumptions are fine for the code to make according to that write up.
