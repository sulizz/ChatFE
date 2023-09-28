import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const SignUp = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:5234/auth/v1.0/signUp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password, firstName, lastName })
            });

            const responseData = await response.json();
            console.log(responseData);
            navigate('/chat', { state: { name: firstName, id: responseData.id } });

        } catch (error) {
            console.error('Error:', error);
        }

    }

    return (
        <div>
            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="FirstName" />
            <br />
            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="LastName" />
            <br />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
            <br />
            <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
            <br />
            <button onClick={handleSubmit}>Sign Up</button>
        </div>
    )
}
