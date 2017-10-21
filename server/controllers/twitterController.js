const url = require('url');
const Validator = require('validatorjs');
const APIError = require('../middlewares/rest').APIError;
const elasticsearch = require('elasticsearch');
const client = new elasticsearch.Client({
    host: 'https://search-es-twitt-map-ir5ds3jwvskixnj3tgrcdphmi4.us-west-2.es.amazonaws.com'
});

module.exports = {
    async getKeywords(ctx, next) {
        await client.search({
            index: 'twitter',
            type: 'tweet',
            body: {
                aggs: {
                    tophashtags: {
                        terms: {
                            field: 'hashtags.keyword'
                        }
                    }
                }
            }
        }).then(function(resp) {
            let hashtags = resp.aggregations.tophashtags.buckets;
            ctx.rest({
                keywords: hashtags
            });
        }, function(err) {
            throw new APIError(err.code, err.message);
            console.trace(err.message);
        });
    },

    async getTweetsByKeyword(ctx, next) {
        let queryData = url.parse(ctx.request.url, true).query;
        let validation = new Validator(queryData, {
            keyword: 'required'
        });
        if (validation.passes()) {
            await client.search({
                index: 'twitter',
                type: 'tweet',
                body: {
                    query: {
                        match: {
                            text: queryData.keyword
                        }
                    }
                }
            }).then(function(resp) {
                // TODO try
                let hits = resp.hits.hits;
                let tweets = hits.map(hit => hit._source);
                ctx.rest({
                    tweets
                });
            }, function(err) {
                throw new APIError(err.code, err.message);
                console.trace(err.message);
            });
        } else {
            // TODO ERROR
            throw new APIError();
        }
    },

    async getTweetsByCoord(ctx, next) {
        let queryData = url.parse(ctx.request.url, true).query;
        let validation = new Validator(queryData, {
            lat: 'required',
            lon: 'required'
        });
        if (validation.passes()) {
            await client.search({
                index: 'twitter',
                    type: 'tweet',
                    body: {
                        query: {
                            bool: {
                                must: {
                                    match_all: {}
                                },
                                filter: {
                                    geo_distance: {
                                        distance: "200km",
                                        "coordinates.coordinates": {
                                            "lat": queryData.lat,
                                            "lon": queryData.lon
                                        }
                                    }
                                }
                            }
                        }
                    }
            }).then(function(resp) {
                // TODO try
                let hits = resp.hits.hits;
                let tweets = hits.map(hit => hit._source);
                ctx.rest({
                    tweets
                });
            }, function(err) {
                throw new APIError(err.code, err.message);
                console.trace(err.message);
            });
        } else {
            // TODO ERROR
            throw new APIError();
        }
    },
}