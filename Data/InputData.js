export const InputData = {
    // ===== URL configuration =====
    Url_Staging: "http://157.230.195.37:3420/",
    Url_Api_Staging: "http://157.230.195.37:3420/api",
    Url_Production: "https://s3.aiozstorage.network",
    Url_Api_Production: "https://api.aiozstorage.network/api",

    // ===== Download configuration =====
    // ===== Upload configuration =====
    Upload_CSV_Path: "Uploads/csv_file.csv",
    Upload_Excel_Path: "Uploads/excel/test.xlsx",
    Upload_PDF_Path: "Uploads/pdf/test.pdf",
    Upload_Word_Path: "Uploads/word/test.docx",
    Upload_Image_Path: "Uploads/image/test.jpg",
    Upload_Video_Path: "Uploads/video/test.mp4",
    Upload_Audio_Path: "Uploads/audio/test.mp3",
    Upload_Zip_Path: "Uploads/zip/test.zip",
    Upload_7z_Path: "Uploads/7z/test.7z",
    Upload_Rar_Path: "Uploads/rar/test.rar",
    Upload_Tar_Path: "Uploads/tar/test.tar",
    Upload_Txt_Path: "Uploads/txt/test.txt",
    Upload_Multi_Files_Path: "Uploads/multi-files/",
    Upload_Small_Files_Path: "Uploads/small-files/test.txt",
    Upload_Large_Files_Path: "Uploads/large-files/test.bin",
    Upload_Over_10GB_Files_Path: "Uploads/over-10gb-files/test.bin",

    // ===== Folder configuration =====
    Folder_Name: "SDK-Folder",

};

export const AuthData = {
    AccessToken: "eyJhbGciOiJSUzI1NiIsImtpZCI6IjAiLCJ0eXAiOiJKV1QifQ.eyJhY2NvdW50X2lkIjoiYWFhN2MwMjYtZTc1MC00NzYwLWJmNzctNTg2OTBiYTMyZWFkIiwiZXhwIjoxNzU4NjEyNTQyLCJpYXQiOjE3NTg1MjYxNDIsImlzcyI6InMzYWlveiIsInJvbGUiOiJhY2NvdW50In0.g4-HhvzqzPxXCdGCTDsjbP-JaKU3ZFaGQCjKKpzCaA9gvvX_uFr9uAa00yWHpkhsapZBre9rxGyf7rrvNni677XR9ayYOjvkAd4mOZAQaw-Kjd5TY__2-a3XFbV1NENyidaRoDECNwrmi90zOFtef3p2LuDJ3yKAYNXZSjZOCcspU8WnTOCj9AhdZhtMwy8DVRKBUxV5Xr4HhepUSmeiUsIo1Mn75KPUvvqzLkx6PEGYwVruNrjeeFCO2ezowuyGSoG0RSdp2Gk-cOUEmm1QdfBGGNdaXX8pZyCxWUD0xX4vZT4QlQ9PFngodaWpDtHBghSivrZPk8FimcpPnHQxbA",
    ServiceToken: "",

    ttlHours: 24, //Never expired by default
};

// ==================== DEFAULT EXPORT ====================
export default {
    InputData,
    AuthData,
};
