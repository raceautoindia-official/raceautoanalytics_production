'use client'
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import './login.css'



const GoogleLoginButton = () => {

    return (


        <Link href={`https://accounts.google.com/o/oauth2/auth?client_id=${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}&redirect_uri=https://raceautoanalytics.com/api/admin/auth/google/callback&response_type=code&scope=openid%20profile%20email`}><button className="google-login-btn">
            {/* <FaGoogle /> */}

            <Image src='/images/search-google.png' alt='search-google' width={20} height={20} />
            <span className='ms-3' style={{ textDecoration: 'none' }}>Login with Google</span>
        </button></Link>

    );
};

export default GoogleLoginButton;
