import fs from 'fs';
import path from 'path';

const s3Config = {
    REGION: process.env.AIOZ_REGION || 'us-east-1',
    ENDPOINT: { url: process.env.AIOZ_ENDPOINT || 'https://s3.aiozstorage.network' }
};

const bucketConfig = {
    ALL_PERMISSIONS: {
        PUBLIC: {
            BUCKET_1: {
                name: 'testauto-1',
                passphrase: 'large tell cabbage initial enable predict slush timber wine able alien wheat',
                credentials: {
                    accessKeyId: 'FRBQ23YLBKUNTPAVMUTXPUODY4',
                    secretAccessKey: 'G7DC7LQU6GCO4ORU4BSRESTGPO6YH4KTBYS5VEW2RYRW2EACQAKA'
                },
                permissions: { read: true, write: true, list: true, delete: true }
            },
            BUCKET_2: {
                name: 'testauto-2',
                passphrase: 'manage place recycle sleep photo title celery begin road balcony cash own',
                credentials: {
                    accessKeyId: 'FSCAB4KT3FLDZEGGOKTJPS4AXU',
                    secretAccessKey: 'G7GJGADHR3AKWFPU2WIGGVY4OY2UPJ2GJCA2ZQD2W4PRYBWW2FLA'
                },
                permissions: { read: true, write: true, list: true, delete: true }
            }
        },
        PRIVATE: {
            BUCKET_1: {
                name: 'testauto-3',
                passphrase: 'lizard clarify badge coconut stamp arch venue satisfy marriage sign legend grain',
                credentials: {
                    accessKeyId: 'FRS3R7DPQKFCBEOOCQF7CSAN6I',
                    secretAccessKey: 'G55MTKC6XM7IU7A36WIQ2CQMKIRRGXEYSOEVWNMGKY5D3VN36UHA'
                },
                permissions: { read: true, write: true, list: true, delete: true }
            },
            BUCKET_2: {
                name: 'testauto-4',
                passphrase: 'kite stone drop recycle soccer genius abstract connect hard erosion win city',
                credentials: {
                    accessKeyId: 'FTOSRFPFZNI6JBFN7JJ37ZZGTI',
                    secretAccessKey: 'G5KFN4775RFAUNG5RZJMGWSWRLGIKW3I4VZXTFJXNPGPBCJDSZOA'
                },
                permissions: { read: true, write: true, list: true, delete: true }
            }
        }
    },
    LIMITED_PERMISSIONS: {
        READ: {
            BUCKET_1: {
                name: 'testdata-1',
                passphrase: 'gas inquiry pilot behave ranch guard fuel category dress creek sausage movie',
                credentials: {
                    accessKeyId: 'FQV7W6EB4TXNBCBSTCJWQNEM5U',
                    secretAccessKey: 'G74GUYPCYVRKBILOVDJRLG5OVEOIU2RFNVDCTJKXSGUAYWOKZXIA'
                },
                permissions: { read: true, write: false, list: false, delete: false }
            }
        },
        WRITE: {
            BUCKET_1: {
                name: 'testdata-1',
                passphrase: 'gas inquiry pilot behave ranch guard fuel category dress creek sausage movie',
                credentials: {
                    accessKeyId: 'FSSEK66BEPXNWK2U55PGAMI4HY',
                    secretAccessKey: 'G5OPQUZSZLUANFBVK2DS63QFJXLCTYZMR3GT4ESWTE2NKUCSKFKQ'
                },
                permissions: { read: false, write: true, list: false, delete: false }
            }
        },
        LIST: {
            BUCKET_1: {
                name: 'testdata-1',
                passphrase: 'gas inquiry pilot behave ranch guard fuel category dress creek sausage movie',
                credentials: {
                    accessKeyId: 'FTWXZWW2Z3O4CEABZKKWFE4GD4',
                    secretAccessKey: 'G6DJ6OWE2UGSPLATWHZOFCMXPBBHBA4BH66LJ6AIWUDEADWW7X4A'
                },
                permissions: { read: false, write: false, list: true, delete: false }
            }
        },
        DELETE: {
            BUCKET_1: {
                name: 'testdata-1',
                passphrase: 'gas inquiry pilot behave ranch guard fuel category dress creek sausage movie',
                credentials: {
                    accessKeyId: 'FRDIBT2XYLYVAIHMWYOCIJ5ULM',
                    secretAccessKey: 'G4NETSIKGO6ZZI22M2BC5LNBB7AA5LCFKWRT2KP62B7XMXLX2BNA'
                },
                permissions: { read: false, write: false, list: false, delete: true }
            }
        },
        READ_WRITE: {
            BUCKET_1: {
                name: 'testdata-1',
                passphrase: 'gas inquiry pilot behave ranch guard fuel category dress creek sausage movie',
                credentials: {
                    accessKeyId: 'FR54X24ZTRKI2CM5UFWWQTHBSU',
                    secretAccessKey: 'G5322NVZ2OUUT67IFF7ST3I6FI2HA7DNWUNNA6EM3B3M4JMBKFZQ'
                },
                permissions: { read: true, write: true, list: false, delete: false }
            }
        },
        READ_DELETE: {
            BUCKET_1: {
                name: 'testdata-1',
                passphrase: 'gas inquiry pilot behave ranch guard fuel category dress creek sausage movie',
                credentials: {
                    accessKeyId: 'FQNYMJJ4D66JVTYOQLVJCEDPIY',
                    secretAccessKey: 'G4RT2DUHLPS3CJH46DGLDEPHDTDYEHFWQMAGPC3WUYUHCBJYIOKQ'
                },
                permissions: { read: true, write: false, list: false, delete: true }
            }
        },
        LIST_WRITE: {
            BUCKET_1: {
                name: 'testdata-1',
                passphrase: 'gas inquiry pilot behave ranch guard fuel category dress creek sausage movie',
                credentials: {
                    accessKeyId: 'FSJNSSWFXXXKBG3ZFG2JY7HUUA',
                    secretAccessKey: 'G5FF2PEDORRKBS2ZNGSWHADEL25VU6X77246H5GWFCTJG5Z72OUA'
                },
                permissions: { read: false, write: true, list: true, delete: false }
            }
        },
        LIST_READ: {
            BUCKET_1: {
                name: 'testdata-1',
                passphrase: 'gas inquiry pilot behave ranch guard fuel category dress creek sausage movie',
                credentials: {
                    accessKeyId: 'FT36FK3MZXJYEJJP5XDRC4TQOM',
                    secretAccessKey: 'G5XQ4W7SD7VBQUNDFFHIYBNOYQEDOULICY3HWUIQNREODVKV4PBA'
                },
                permissions: { read: true, write: false, list: true, delete: false }
            }
        },
        WRITE_DELETE: {
            BUCKET_1: {
                name: 'testdata-1',
                passphrase: 'gas inquiry pilot behave ranch guard fuel category dress creek sausage movie',
                credentials: {
                    accessKeyId: 'FTQLGRVDLM6A6DJJV7P6UNYZ4E',
                    secretAccessKey: 'G6HTU2WBMHNZF5BUSV2KRHS3SA2ADTECLKPMN3Q6MPTBPOFBXHRA'
                },
                permissions: { read: false, write: true, list: false, delete: true }
            }
        },
        LIST_DELETE: {
            BUCKET_1: {
                name: 'testdata-1',
                passphrase: 'gas inquiry pilot behave ranch guard fuel category dress creek sausage movie',
                credentials: {
                    accessKeyId: 'FTDWNPIZG4DT3OT7CIYSTQS2XM',
                    secretAccessKey: 'G5L3EP5AO5QZJSNRXO42LQP2HM367A6HQ3VDO6URKSTTFWG6AWUA'
                },
                permissions: { read: false, write: false, list: true, delete: true }
            }
        },
        READ_WRITE_LIST: {
            BUCKET_1: {
                name: 'testdata-1',
                passphrase: 'gas inquiry pilot behave ranch guard fuel category dress creek sausage movie',
                credentials: {
                    accessKeyId: 'FSY7L6LPXU3AIE2DD2HNXM7XM4',
                    secretAccessKey: 'G7NHTUYNSAZIKWVE2DNT7D5XOO2JXSPHLNTDRQGRARB5BJHQBS7A'
                },
                permissions: { read: true, write: true, list: true, delete: false }
            }   
        },
        READ_WRITE_DELETE: {
            BUCKET_1: {
                name: 'testdata-1',
                passphrase: 'gas inquiry pilot behave ranch guard fuel category dress creek sausage movie',
                credentials: {
                    accessKeyId: 'FTKZM4PD35KAPRK4UJ6OJCSXSM',
                    secretAccessKey: 'G6NCFVSPRFGBLBJDHPMGMDBBYUOCZRWE6WNH5QAT3DDWURGKT43A'
                },
                permissions: { read: true, write: true, list: false, delete: true }
            }
        },
        READ_LIST_DELETE: {
            BUCKET_1: {
                name: 'testdata-1',
                passphrase: 'gas inquiry pilot behave ranch guard fuel category dress creek sausage movie',
                credentials: {
                    accessKeyId: 'FT7AELHLSFRIVPPGQBT5EL7JQQ',
                    secretAccessKey: 'G6R3LE6THRTJ7MRKBPCC72FNGN5DHHGBYQOLZL4PUCFVEJNRYBFQ'
                },
                permissions: { read: true, write: false, list: true, delete: true }
            }
        },
        WRITE_LIST_DELETE: {
            BUCKET_1: {
                name: 'testdata-1',
                passphrase: 'gas inquiry pilot behave ranch guard fuel category dress creek sausage movie',
                credentials: {
                    accessKeyId: 'FTXBFBDBVX3YXWN7TWP2XGQHP4',
                    secretAccessKey: 'G7OQQUQ4X6NRG64IR3T6QFPTC5W7YBP5CAOGB2CFBKLAI22M34GA'
                },
                permissions: { read: false, write: true, list: true, delete: true }
            }
        },
        READ_WRITE_LIST_DELETE: {
            BUCKET_1: {
                name: 'testdata-1',
                passphrase: 'gas inquiry pilot behave ranch guard fuel category dress creek sausage movie',
                credentials: {
                    accessKeyId: 'FT6FQBC33MJ3OFC77TJL4LLLIM',
                    secretAccessKey: 'G4FXCA7X3UFAZEJMIFYBUOXY252YCAMF33T3S5JYVEEYBUWQIDFA'
                },
                permissions: { read: true, write: true, list: true, delete: true }
            }
        }
    }
};

const fileConfig = {
    DOWNLOAD_DIR: path.resolve(process.cwd(), '../Downloads'),
    UPLOAD_DIR: path.resolve(process.cwd(), '../Uploads'),
    LARGE_FILES_DIR: path.resolve(process.cwd(), '../LargeFiles'),
    TEST_FOLDER: 'test-files/',
    DEFAULT_FILE_NAME: 'test.txt',
    LARGE_FILES_FOLDER: 'large-files/',
    LARGE_FILE_NAME: 'large-test.bin',
    SMALL_FILES_FOLDER: 'small-files/',
    SMALL_FILE_NAME: 'test.txt',
    MULTI_FILES_FOLDER: 'multi-files/'
};

const folderConfig = {
    FOLDER_DIR: path.resolve(process.cwd(), '../Folders')
};

const uploadConfig = {
    CHUNK_SIZE: 5 * 1024 * 1024, // 5MB chunks
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // 1 second
    CONCURRENT_UPLOADS: 3,
    LARGE_FILE_SIZE: 1024 * 1024 * 1024 // 1GB
};

const downloadConfig = {
    DOWNLOAD_DIR: path.resolve(process.cwd(), '../Downloads')
};

const metadataConfig = {
    CATEGORY: 'test-files',
    VERSION: '1.0',
    DEFAULT_METADATA: {
        'custom-category': 'test-files',
        'custom-version': '1.0'
    },
    LARGE_FILE_CONTENT_TYPE: 'application/octet-stream'
};



// Add permission types
const permissionTypes = {
    ALL_PERMISSIONS: ['READ', 'WRITE', 'LIST', 'DELETE'],
    READ: ['READ'],
    WRITE: ['WRITE'],
    LIST: ['LIST'],
    DELETE: ['DELETE'],
    READ_WRITE: ['READ', 'WRITE'],
    READ_DELETE: ['READ', 'DELETE'],
    LIST_WRITE: ['LIST', 'WRITE'],
    LIST_READ: ['LIST', 'READ'],
    WRITE_DELETE: ['WRITE', 'DELETE'],
    LIST_DELETE: ['LIST', 'DELETE'],
    READ_WRITE_LIST: ['READ', 'WRITE', 'LIST'],
    READ_WRITE_DELETE: ['READ', 'WRITE', 'DELETE'],
    READ_LIST_DELETE: ['READ', 'LIST', 'DELETE'],
    WRITE_LIST_DELETE: ['WRITE', 'LIST', 'DELETE']
};

export {
    s3Config,
    bucketConfig,
    fileConfig,
    folderConfig,
    uploadConfig,
    downloadConfig,
    metadataConfig,
    permissionTypes
}; 