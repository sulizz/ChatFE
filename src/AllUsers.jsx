import { useEffect, useState } from 'react'

export const AllUsers = ({ onUserSelect, currentUserId }) => {
    const [users, setUsers] = useState([]); // State to store users

    useEffect(() => {
        const fetchData = async () => {
            const response = await fetch('http://localhost:5234/auth/v1.0/users');
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        }
        fetchData();
    }, []);

    const filteredUsers = users.filter(user => user.id !== currentUserId);

    return (
        <div>
            <h2>All Users</h2>
            <ul>
                {filteredUsers.map(user => (
                    <li key={user.id} onClick={() => onUserSelect(user.id)}>
                        {user.firstName} {user.lastName}
                    </li>
                ))}
            </ul>
        </div>
    )
}
