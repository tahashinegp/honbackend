module.exports = {
    disablingOfRemoteMethods: (
        definedModel,
        arrDisableHasMany = [],
        arrDisableHasOne = [],
        arrDisableBelongsTo = []
      ) =>
      disablingOfRemoteMethods(
          definedModel,
          arrDisableHasMany,
          arrDisableHasOne,
          arrDisableBelongsTo
        ),
}


function disablingOfRemoteMethods(
    desiredModel,
    arrDisableHasMany,
    arrDisableHasOne,
    arrDisableBelongsTo
  ) {
    desiredModel.disableRemoteMethodByName('count', true);
    desiredModel.disableRemoteMethodByName('upsertWithWhere', true);
    desiredModel.disableRemoteMethodByName('replaceOrCreate', true);
    desiredModel.disableRemoteMethodByName('createChangeStream', true);
    desiredModel.disableRemoteMethodByName('patchAttributes', true);
    desiredModel.disableRemoteMethodByName('patchOrCreate', true);
    desiredModel.disableRemoteMethodByName('findOne', true);
    desiredModel.disableRemoteMethodByName('exists', true);
    desiredModel.disableRemoteMethodByName('prototype.patchAttributes', false);
    desiredModel.disableRemoteMethodByName('find', true);
    desiredModel.disableRemoteMethodByName('findById', true);
    desiredModel.disableRemoteMethodByName('updateAll', true);
    desiredModel.disableRemoteMethodByName('replaceById', true);
    desiredModel.disableRemoteMethodByName('create', true);
    desiredModel.disableRemoteMethodByName('deleteById', true);
    for (let disabled of arrDisableHasMany) {
      desiredModel.disableRemoteMethodByName(
        `prototype.__count__${disabled}`,
        false
      );
      desiredModel.disableRemoteMethodByName(
        `prototype.__create__${disabled}`,
        false
      );
      desiredModel.disableRemoteMethodByName(
        `prototype.__delete__${disabled}`,
        false
      );
      desiredModel.disableRemoteMethodByName(
        `prototype.__destroyById__${disabled}`,
        false
      );
      desiredModel.disableRemoteMethodByName(
        `prototype.__findById__${disabled}`,
        false
      );
      desiredModel.disableRemoteMethodByName(
        `prototype.__get__${disabled}`,
        false
      );
      desiredModel.disableRemoteMethodByName(
        `prototype.__updateById__${disabled}`,
        false
      );
    }
    for (let disabled of arrDisableBelongsTo) {
      desiredModel.disableRemoteMethodByName(
        `prototype.__get__${disabled}`,
        false
      );
    }
    for (let disabled of arrDisableHasOne) {
      desiredModel.disableRemoteMethodByName(
        `prototype.__destroy__${disabled}`,
        false
      );
      desiredModel.disableRemoteMethodByName(
        `prototype.__update__${disabled}`,
        false
      );
      desiredModel.disableRemoteMethodByName(
        `prototype.__get__${disabled}`,
        false
      );
      desiredModel.disableRemoteMethodByName(
        `prototype.__create__${disabled}`,
        false
      );
    }
  }
  