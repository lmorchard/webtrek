/**
 * Vector math and other fun
 */
WebTrek.Math = ( function () {

    var $this = {

        init: function () {
            return $this;
        },

        vector_add: function(a, b) {
            return [a[0] + b[0], a[1] + b[1]];
        },

        vector_sub: function(a, b) {
            return [a[0] - b[0], a[1] - b[1]];
        },

        vector_mul: function(a, v) {
            return [a[0] * v, a[1] * v];
        },

        vector_div: function(a, v) {
            return [a[0] / v, a[1] / v];
        },

        vector_pow: function(a, exponent) {
            return [Math.pow(a[0], exponent), Math.pow(a[1], exponent)];
        },

        vector_abs: function(v) {
            return [Math.abs(v[0]), Math.abs(v[1])];
        },

        /**
         *  Get unit vector
         */
        vector_unit: function(a){
            var l = vector_len(a);
            return [a[0]/l, a[1]/l];
        },

        /**
         *  Get dot product from two vectors
         */
        vector_dot: function(a, b) {
            return (a[0]*b[0])+(a[1]*b[1]);
        },

        /**
         *  Vector length
         */
        vector_len: function(a) {
            return Math.sqrt(a[0]*a[0]+a[1]*a[1]);
        },

        /**
         *  Vector square length
         */
        vector_lens: function(a) {
            return a[0]*a[0]+a[1]*a[1];
        },

        /**
         * Projects vector a onto vector b 
         */
        vector_proj: function(a, b) {
            bls = vector_lens(b);
            if (bls!==0) { return vector_mul(b,vector_dot(a,b)/bls); }
            else { return [0,0]; }
        },

        /**
         * Rotates one or more vectors
         */
        vector_rotate: function() {
            var args = Array.prototype.slice.call(arguments);
            var angle = args.shift();
            var result = [];
            var sin=Math.sin(angle);
            var cos=Math.cos(angle);
            var vector;

            while (vector = args.shift()) {
                result.push([vector[0] * cos - vector[1] * sin, 
                vector[0] * sin + vector[1] * cos]);
            }

            return result.length == 1 ? result[0] : result;
        },


        EOF:null
    };

    return $this.init();
})();
