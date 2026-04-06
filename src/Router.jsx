import { BrowserRouter, Routes, Route, Navigate} from "react-router-dom";
import React from 'react'
import Home from "./routes/Home.jsx";

const Router = () => {
    return (
            <BrowserRouter>
      <Routes>
               <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<Home />} />
      </Routes>
    </BrowserRouter>
    )
}
export default Router
