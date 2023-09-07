const axios = require('axios');

const testing = async () => {
  try {
    const response = await axios.post('https://staging-api.imsmetals.com:5443/api/ImsAuthenticate/v1/Authenticate', {
      "id": "H3zFUurzPjFkDdcWWY/Xx9AnFowU5+lmPe6SJIMPSXXf9j1yqBSN0myHWJ4mhJI+T9Z1nKi+HkknXdAa5HlBbg=="
    }, {
      // headers: basicAuthHeaders
    }
    )
  
      console.log('success',response.data);
      let authToken = response.data.authToken
       console.log('authToken',authToken); 
       const authorization = 'Bearer ' + authToken
       console.log('authorization',authorization);
        const getresponse = await axios.get(`https://dev-api.imsmetals.com:5443/api/ImsAccount/v1/quote/lookupgen/1491390`, {
            headers: {
              "Authorization": authorization
            }
          })
          console.log('getresponse',getresponse);
  } catch (error) {
    console.log('error',error);
  }
  



  
}

testing()