var express = require('express');
var cors = require ('cors');

var router = express.Router();
router.use(cors());

const endpoints = require('../../endpoints');
const rest_data = require('./rest_data');
const graphql_data = require('./graphql_data');
const dt = require('./data_transformation');

/* GET home page. */
router.get('/', function(req, res, next) {
    res.json({
        "title": "API del Sistema 2",
        "version": '1.0'
    });
});

router.post('/entities', (req, res) => {
    // entidades de uno o más proveedores de información
    // las entidades debería traer:
    // nivel de gobierno
    // supplier_id

    // un proveedor de información podría traer de varios niveles
    const {nivel_gobierno} = req.body;

    let endpoints_ = [];

    if (typeof nivel_gobierno !== 'undefined' && nivel_gobierno !== null && nivel_gobierno !== '') {
        endpoints_ = endpoints.filter(e => e.levels.includes(nivel_gobierno));
    } else {
        endpoints_ = endpoints;
    }

    let promises = endpoints_.map( endpoint => {
        //console.log(endpoint.type);
        if (endpoint.type === 'REST') {
            return rest_data.fetchEntities(endpoint);

        } else if (endpoint.type === 'GRAPHQL'){
            return graphql_data.fetchEntities(endpoint)
        }

    });

    Promise.all(promises).then( data => {
        // asignar supplier
        let entities = [];
        const dl = data.length;

        for (let i=0; i < dl; i++){
            entities = entities.concat(data[i].map(entity => {
                entity.supplier_id = i;
                return entity;
            }));
        }

        const cfn = (a, b) => {
            if(a.nombre < b.nombre) { return -1; }
            if(a.nombre > b.nombre) { return 1; }
            return 0;
        };

        res.json(entities.sort(cfn));
    }).catch(error => {
        console.log(error);
    });

});


router.post('/summary', (req, res)=> {
    // búsqueda general

    const { body } =  req;
    const { nivel_gobierno } = body;

    let options = {
        page: 1,
        pageSize: 1,
        query : {}
    };

    const params = [
        'nombres',
        'primerApellido',
        'segundoApellido',
        'procedimiento',
        'institucion'
    ];

    for (let k of params){
        if (body.hasOwnProperty(k) && typeof body[k] !== 'undefined' && body[k] !== null && body[k] !== '') {
                options.query[k] = body[k];
        }
    }

    console.log(options);

    //si seleccionó nivel, filtrar endpoints
    let endpoints_ = [];

    if (typeof nivel_gobierno !== 'undefined'&& nivel_gobierno !== null && nivel_gobierno !== ''){
        endpoints_ = endpoints.filter(e => e.levels.includes(nivel_gobierno));
    } else {
        endpoints_ = endpoints;
    }

    console.log(endpoints_);

    let queries = endpoints_.map( endpoint => {
        if (endpoint.type === 'REST'){
            return rest_data.fetchData(endpoint, options).catch( error => ({
                supplier_id: endpoint.supplier_id,
                supplier_name: endpoint.supplier_name,
                error: "Algo salió mal."
            }) );
        } else if (endpoint.type === 'GRAPHQL'){
            return graphql_data.fetchData(endpoint, options).catch( error => ({
                supplier_id: endpoint.supplier_id,
                supplier_name: endpoint.supplier_name,
                error: "Algo salió mal."
            }));
        }
    });

    Promise.all(queries).then( data => {
        //console.log(data);
        let summary = data.map (d => {

            if (typeof d.error !== 'undefined'){
                return d;
            } else {
                return {
                    supplier_id: d.supplier_id,
                    supplier_name: d.supplier_name,
                    levels: d.levels,
                    totalRows: d.pagination.totalRows
                }
            }
        });

        res.json(summary);
    }).catch(error => {
        console.log(error);
        res.json(error);
    });
});

// busqueda en un solo proveedor de información
router.post('/search', (req, res) => {

    const { body } = req;
    const { supplier_id } = body;
    let {
        page,
        pageSize
    } =  body;

    if (typeof page === 'undefined' || page === null || isNaN(page)){
        page = 1;
    }

    if (typeof pageSize === 'undefined' || pageSize === null || isNaN(pageSize)){
        pageSize = 10;
    }

    let endpoint = endpoints.find(d => d.supplier_id === supplier_id);

    console.log(endpoint);

    let options = {
        page,
        pageSize,
        query: {}
    };

    const params = [
        'nombres',
        'primerApellido',
        'segundoApellido',
        'procedimiento',
        'institucion',
    ];

    for (const k of params){
        if (body.hasOwnProperty(k) && typeof body[k] !== 'undefined' && body[k] !== null && body[k] !== '') {
            options.query[k] = body[k];
        }
    }

    console.log(options);

    if (endpoint.type === 'REST') {
        rest_data.fetchData(endpoint, options).then(data => {
            res.json(data);
        });
    } else if (endpoint.type === 'GRAPHQL'){
        graphql_data.fetchData(endpoint, options).then(data => {
            res.json(dt.sfp(data));
        });
    }

});

/*
router.get('/test', (req, res) => {
   graphql_data.fetchData(endpoints[1], {page: 1 , pageSize: 10, query: {}}).then(data => {
      console.log(data);
      res.json(data);
   });
});
*/

module.exports = router;