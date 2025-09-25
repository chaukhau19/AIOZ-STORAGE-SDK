import { s3Config as envS3Config } from './Environment.js';

// ==================== S3 CONFIG ====================
export const s3Config = envS3Config;

// ==================== BUCKET CONFIG ====================
export const BUCKET_CONFIG = {
    Bucket_1: { bucket_name: 'datatest-1', passphrase: 'gas inquiry pilot behave ranch guard fuel category dress creek sausage movie' },
    Bucket_2: { bucket_name: 'datatest-2', passphrase: 'marble habit stand return cushion payment arrow crazy noodle dumb tattoo sphere' },
    Bucket_3: { bucket_name: 'datatest-3', passphrase: 'liar ordinary almost high quarter envelope lift noble kitten fox draw minimum' },
    Bucket_4: { bucket_name: 'datatest-4', passphrase: 'genius garbage space opinion vanish worry tortoise web object exclude word urge' },
    Bucket_5: { bucket_name: 'testauto-1', passphrase: 'large tell cabbage initial enable predict slush timber wine able alien wheat' },
    Bucket_6: { bucket_name: 'testauto-2', passphrase: 'manage place recycle sleep photo title celery begin road balcony cash own' },
    Bucket_7: { bucket_name: 'testauto-3', passphrase: 'lizard clarify badge coconut stamp arch venue satisfy marriage sign legend grain' },
    Bucket_8: { bucket_name: 'testauto-4', passphrase: 'kite stone drop recycle soccer genius abstract connect hard erosion win city' },
};

// ==================== PERMISSION COMBINATIONS ====================
export const PERMISSION_COMBINATIONS = Object.freeze({
    NONE: { read: false, write: false, list: false, delete: false },
  
    READ: { read: true, write: false, list: false, delete: false },
    WRITE: { read: false, write: true, list: false, delete: false },
    LIST: { read: false, write: false, list: true, delete: false },
    DELETE: { read: false, write: false, list: false, delete: true },
  
    READ_WRITE: { read: true, write: true, list: false, delete: false },
    READ_DELETE: { read: true, write: false, list: false, delete: true },
    WRITE_LIST: { read: false, write: true, list: true, delete: false },
    READ_LIST: { read: true, write: false, list: true, delete: false },
    WRITE_DELETE: { read: false, write: true, list: false, delete: true },
    LIST_DELETE: { read: false, write: false, list: true, delete: true },
  
    READ_WRITE_LIST: { read: true, write: true, list: true, delete: false },
    READ_WRITE_DELETE: { read: true, write: true, list: false, delete: true },
    READ_LIST_DELETE: { read: true, write: false, list: true, delete: true },
    WRITE_LIST_DELETE: { read: false, write: true, list: true, delete: true },
  
    READ_WRITE_LIST_DELETE: { read: true, write: true, list: true, delete: true }
  });


  // ==================== CREDENTIALS COMBINATIONS ====================
  export const CREDENTIALS_COMBINATIONS = Object.freeze({
    NONE: { accessKeyId: '', secretAccessKey: '' },

    READ: { accessKeyId: 'FSMKXKEDGKHEWWEAS7EWHTAK7Q', secretAccessKey: 'G4COY3CGSA6B3P5F6LWK2NXGGVOOLOC53G2OMUNQVLZPSFDDM6EA' },
    WRITE: { accessKeyId: 'FRKJ6U6VTVGINSZJSE7PNOXLCE', secretAccessKey: 'G6WNL2RRJ3UYXIBHAHIQWQFZGSOL4SMADVNYVEEWOMPSUABESQDA' },
    LIST: { accessKeyId: 'FQHKINZWRAVSGH4GCBOP52565E', secretAccessKey: 'G73CFFU732RIT4DZXEPGL77FKNE4PVWCAYOMJGNWV5NC73YBYH3A' },
    DELETE: { accessKeyId: 'FTYWA7AEJBUNJYKZBUKHHCRDGY', secretAccessKey: 'G6YE74BCZQJIH3ESEAWIYG3AUIKSX7WT7ZWNX4OHNV7VN5Y5MWHQ' },

    READ_WRITE: { accessKeyId: 'FRQKUA3DJGBHAFRKZ7THJQ7N2Y', secretAccessKey: 'G7NM7BKT7W5UGV57H4UFUYXW3H4CCKZW3HX4HKXRFWVF4LKGCSDQ' },
    READ_LIST: { accessKeyId: 'FQRXC26ICHZBMGBVDIIMBUTOLQ', secretAccessKey: 'G5FVEJ7NECOGAJHRWGMCSNBGT46GQ3DIEOU2YQDM6TK56CQX7KTQ' },
    READ_DELETE: { accessKeyId: 'FRG64SKDCDP475QV47B6PODDYQ', secretAccessKey: 'G4FUMHQGNDLGZFKGSY5CKA6WW5VHXZTG3B7E7EOYN3MZKIZ4W6YQ' },
    WRITE_LIST: { accessKeyId: 'FSJBQ5LN3WU2UVGKWUFIOXI7GY', secretAccessKey: 'G57TE6HRG3AGDUXSJYNEJEEJ3ZB5UXGKPCWFUXOQYR3RRIO74TSQ' },
    WRITE_DELETE: { accessKeyId: 'FS3RPPIZOH5DHKAAQ2OANC6XZU', secretAccessKey: 'G6DRSQLQPC75CDKLTNWOBU2ZT5N7RFC5HOZSK2UAUC6FJKMATXWA' },
    LIST_DELETE: { accessKeyId: 'FQWEYVN44VEBEDHM2PNZH3FDIU', secretAccessKey: 'G4GXKU4DGNE4OWULON77ZLLIHP2TR5QW2GOTIBDYWQDH6PFTA2TQ' },

    READ_WRITE_LIST: { accessKeyId: 'FQPX2VKI6B4DXYLRW4B73LWY7U', secretAccessKey: 'G5DIWE7T23ETTPI7JHXUQDMRLZRP2I67IPGFGNI5JIM6OQMJCMQQ' },
    READ_WRITE_DELETE: { accessKeyId: 'FS7EEJC4ZN3H24A6P4XNQMAUNU', secretAccessKey: 'G7RCI6SBF7QRN4G5SCIBCNY6RPZDLT33I5KDJUCOALIR5IVLUIJA' },
    READ_LIST_DELETE: { accessKeyId: 'FSQX7PNM2AHZ7T4VOI54JLPSW4', secretAccessKey: 'G7U3NPJMTLIPKTMORXGLCL2U37NZZN62KE6X37UXXWQHVKT4R7PQ' },
    WRITE_LIST_DELETE: { accessKeyId: 'FSH3CJ5WJWQQVBLBKOQMN7UIZE', secretAccessKey: 'G7JVKKPG3NXGIAJEJG2MYITVEAPS5SALQQPJ6HZWJXLHR47VEIVA' },
    
    READ_WRITE_LIST_DELETE: { accessKeyId: 'FQZDFS4OZTEOO7VNORSPERT2PQ', secretAccessKey: 'G7H6VZGUIO6S3QXHFZO3KGXYT26Y7HBGZTSDC5PORCCPSSYOBLWQ' },
});
// ==================== LIMITED CREDENTIALS ====================
// Credentials moved to Data/S3Credentials/Credentials.js for tests

export default {
    PERMISSION_COMBINATIONS,
    CREDENTIALS_COMBINATIONS
};