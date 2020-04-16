const { ObjectId } = require('mongodb')

module.exports = {
    getPaymentMethodObj: id => [
      { $match: { _id: ObjectId(id) } },
      { $unwind: '$paymentMethod' },
      {
        $match: {
          'paymentMethod.isDeleted': false
        }
      },
      { $sort: { 'paymentMethod.isPrimary': -1 } },
      {
        $group: {
          _id: '$_id',
          paymentMethod: { $push: '$paymentMethod' }
        }
      }
    ],
    getPaymentMethodByIdObj: (id, paymentId) => [
      { $match: { _id: ObjectId(id) } },
      { $project: { paymentMethod: '$paymentMethod' } },
      { $unwind: '$paymentMethod' },
      {
        $match: {
          'paymentMethod.isDeleted': false,
          'paymentMethod.id': paymentId
        }
      }
    ]
}
