import { useState, useEffect } from 'react'
import axios from "axios";
import { authBaseUrl } from "./Url"
import { ChatComponent } from "./ChatComponent";
import { useLocation } from "react-router-dom";
import { USER_TYPES } from "./Login";

export const UserProfile = () => {
    const location = useLocation();

    const tokenFromState = location.state?.token;
    const userType = location.state?.type;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userInfo, setUserInfo] = useState(null);

    const isEnterprise = userType === USER_TYPES.Enterprise;
    const endpoint = isEnterprise ? 'userinfo/enterprise' : 'userinfo';

    useEffect(() => {

        const fetchEnterpriseUserInfo = async () => {
            try {
                setLoading(true);
                const response = await axios.get(authBaseUrl + endpoint, {
                    headers: {
                        'Authorization': `Bearer ${tokenFromState}`
                    }
                })

                setUserInfo(response.data);
                setLoading(false);

            } catch (error) {
                setLoading(false);
                setError(error);
                console.error("Error fetching user info", error);
            }
        }
        fetchEnterpriseUserInfo();

    }, [tokenFromState, userType])

    if (loading) return <h1>Loading</h1>
    if (error) return <h1>Error</h1>

    return (
        <div>
            <h2>Welcome {userInfo?.fullName} {userInfo.id}</h2>
            <br></br>
            <ChatComponent name={userInfo?.fullName} id={userInfo?.id} token={tokenFromState} />
        </div>
    )
}
