import React, { useContext } from 'react'
import { ChatContext } from '../context/ChatProvider'
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({children}) => {
    
    const {key,isLoading} = useContext(ChatContext);
    if(isLoading) return <div>Loading...</div>
    if(!key) return <Navigate to={"/"} replace />
    else return children
}

export default ProtectedRoute