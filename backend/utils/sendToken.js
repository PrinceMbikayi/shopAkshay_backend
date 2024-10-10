export default (user, statusCode, res) => {
    // Create JWT Token
    const token = user.getJwtToken();
  
    // Options for cookie
    const options = {
        expires: new Date(
            Date.now() + process.env.COOKIE_EXPIRES_TIME * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "None",
    };
  
    // Remove password from user object before sending response
    user.password = undefined;
  
    res.status(statusCode).cookie("token", token, options).json({
        success: true,
        token,
        user, // Include user data in the response
    });
  };
  