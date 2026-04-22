exports.success = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    status: true,
    message,
    data
  })
}

exports.error = (res, message = 'Something went wrong', statusCode = 400) => {
  res.status(statusCode).json({
    status: false,
    message
  })
}