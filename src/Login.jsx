import { useState } from 'react'
import axios from 'axios';
import { useNavigate } from "react-router-dom";
import { authBaseUrl } from "./Url";

export const USER_TYPES = {
    User: 'User',
    Enterprise: 'Enterprise'
};

export const Login = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('sulizbasnet@appboxtech.com');
    const [password, setPassword] = useState('123456');
    const [type, setType] = useState('');

    const handleSubmit = async () => {
        try {
            const payload = {
                "username": email,
                password
            };
            if (type === USER_TYPES.Enterprise) {
                payload.type = type;

            }
            const response = await axios.post(authBaseUrl + 'login', payload)
            const { access_token } = response.data;
            navigate('/userProfile', { state: { token: access_token, type: type }, });
        }
        catch (error) {
            console.error('Error during login', error);
        }
    }
    return (
        <div>
            <select value={email} onChange={(e) => setEmail(e.target.value)}>
                <option>Select Type</option>
                <option value={"sulizbasnet@appboxtech.com"}>Enterprise suliz</option>
                <option value={"usersulizbasnet@appboxtech.com"}>user suliz1</option>
                <option value={"sulizbasnet100@appboxtech.com"}>user suliz2</option>
            </select>
            <br />
            <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
            <br />
            <select value={type} onChange={(e) => setType(e.target.value)}>
                <option>Select Type</option>
                <option value={USER_TYPES.Enterprise}>{USER_TYPES.Enterprise}</option>
            </select>
            <button onClick={handleSubmit}>Log In</button>
        </div>
    )
}
