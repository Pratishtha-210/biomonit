//controller to handle push data API hit.
exports.pushDataToDatabase = async (req, res, next) => {
    try{
      
      console.log("push data called");
      console.log(req.body);
      res.json({
        success: true,
        message: 'push data endpoint reached success'
      });
    }catch(e){
      console.log("error in push-data route",e);
    }
};

module.exports = exports;