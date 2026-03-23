import React from 'react';
export default function Test() {
    const handle = () => axios.get('/test');
    return <div onClick={handle}>Test</div>;
}
