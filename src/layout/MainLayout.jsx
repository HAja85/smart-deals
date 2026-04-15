import React, { useEffect } from 'react'
import Navbar from '../components/Navbar/Navbar'
import { Outlet, useLocation } from 'react-router'
import Footer from '../components/Footer/Footer'
import { Bounce, ToastContainer } from 'react-toastify'
import Swal from 'sweetalert2'

const MainLayout = () => {
  const location = useLocation();

  useEffect(() => {
    Swal.close();
  }, [location.pathname]);

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        transition={Bounce}
      />
      <Navbar />
      <div className="min-h-[61vh] bg-[#f5f5f5]">
        <Outlet />
      </div>
      <Footer />
    </>
  )
}

export default MainLayout
