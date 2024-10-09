// Create token and save in the cookie
export default (user, statusCode, res) => {
    //Create JWT Token
    const token = user.getJwtToken();

    // Options for cookie
    // Options for cookie
const options = {
    expires: new Date(
      Date.now() + process.env.COOKIE_EXPIRES_TIME * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    sameSite: "None",    // Allows cross-site cookies (frontend and backend on different domains)
  };
   
  res.status(statusCode).cookie("token", token, options).json({
    token,
  });
  
};