import axios from 'axios';
import { showAlert } from './alert';

export const updateSettings = async (data, type) => {  
    try {
        const url = type === 'password' 
            ? 'http://localhost:3000/api/v1/users/updatePassword'
            : 'http://localhost:3000/api/v1/users/updateMe'
            
        const res = axios({
            method: 'PATCH',
            url ,
            data
        })

        if (res.data.status === 'success') {
           showAlert('success', 'Data updated sucessfully')
        }
    
    } catch (err) {
        showAlert('error', err.response.data.message);
    }

}