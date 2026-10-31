// Copy to js/config.js and fill in. Never put secret keys here (these values are public by design).
export const CONFIG={
 firebase:{apiKey:'',authDomain:'',projectId:'',appId:''},
 cloudinary:{cloudName:'',uploadPreset:''}, // unsigned preset limited to images, max size, folder "products"
 useFunctions:false,
 paystackPublicKey:'',                     // pk_live_... or pk_test_... (public key only, never the secret key)
 whatsapp:'234XXXXXXXXXX'                   // business number, digits only
};
